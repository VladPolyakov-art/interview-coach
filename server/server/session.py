"""TextDriver: one practice session on a text LLM (Ollama, OpenAI-compatible, Claude CLI) with local
speech-to-text and Kokoro speech. Same interface as GeminiLiveDriver, so the WebSocket loop treats both alike.

Latency plan (D33, target 2-3 s per turn):
- the opening line is fixed copy (no model call) and the model warms up while the user answers;
- the interviewer reply is JSON (P1) streamed; `action` arrives first, and for `next_question` the code
  speaks "Okay." plus the next question verbatim without waiting for the model;
- `say` is spoken sentence by sentence while the model is still writing.
"""
from __future__ import annotations

import asyncio
import logging
import re
import time
from typing import AsyncGenerator, AsyncIterator, Callable, Optional

from . import content, tts
from .content import Question
from .engines.base import EngineError, LLMEngine
from .engines.gemini_live import drop_last_answer
from .feedback import WORD, JsonFieldStreamer, mark_misheard, hints, norm, sanitize_sentence, trim_words
from .planner import max_follow_ups
from .stt import STT, Transcript

log = logging.getLogger("uvicorn.error")
SENTENCE_END = re.compile(r"(.+?[.!?…])(?:\s+|$)", re.S)
REPEAT = re.compile(r"\b(repeat|say (that|it) again|pardon|didn't (catch|hear)|one more time)\b", re.I)
GAP_TAG = {"own_part": "YP", "result": "RN", "reflection": "WD", "tradeoff": "CT"}
TAG_PREFIX = re.compile(r"^\s*(?:YP|RN|WD|CT)\s*[:\-–]\s*")
PREVIEW_SECONDS = 12
MAX_RECORD_BYTES = 16000 * 2 * 240      # up to 4 minutes per answer


class TextDriver:
    needs_server_stt = True

    def __init__(self, llm: LLMEngine, *, mode: str = "interview", plan: list[Question] | None = None,
                 strictness: int = 2, level: str = "B1", voice: str = "", speed: float = 1.0, speak: bool = True,
                 stt: STT | None = None, settings: dict | None = None, topic: str = "",
                 on_turn_start: Optional[Callable] = None, on_transcript_delta: Optional[Callable] = None,
                 on_turn_complete: Optional[Callable] = None, on_interrupted: Optional[Callable] = None,
                 on_ready: Optional[Callable] = None, on_response_complete: Optional[Callable] = None,
                 on_audio_chunk: Optional[Callable] = None, on_notice: Optional[Callable] = None,
                 on_preview: Optional[Callable] = None, on_error: Optional[Callable] = None,
                 on_user_transcript: Optional[Callable] = None, on_metrics: Optional[Callable] = None,
                 **_ignored) -> None:
        self.llm = llm
        self.mode = mode
        self.plan = list(plan or [])
        if mode == "interview" and not self.plan:
            raise ValueError("an interview needs at least one question")
        self.strictness = strictness
        self.max_follow_ups = max_follow_ups(strictness)
        self.level = level
        self.voice = tts.resolve_voice(voice)
        self.speed = speed
        self.settings = settings or {}
        self.speak = speak and tts.kokoro_model(self.settings) is not None
        self.produces_audio = self.speak
        self.stt = stt
        self.topic = topic
        self.on_turn_start = on_turn_start
        self.on_transcript_delta = on_transcript_delta
        self.on_turn_complete = on_turn_complete
        self.on_interrupted = on_interrupted
        self.on_ready = on_ready
        self.on_response_complete = on_response_complete
        self.on_audio_chunk = on_audio_chunk
        self.on_notice = on_notice
        self.on_preview = on_preview
        self.on_error = on_error
        self.on_user_transcript = on_user_transcript
        self.on_metrics = on_metrics

        self.transcript_history: list[dict] = []
        self.q_index = 0
        self.follow_ups: list[str] = []
        self.finished = False
        self._snapshots: list[tuple[int, list[str], bool]] = []
        self._running = False
        self._reply_task: Optional[asyncio.Task] = None
        self._preview_task: Optional[asyncio.Task] = None
        self._warm_task: Optional[asyncio.Task] = None
        self._buffer = bytearray()
        self._recording = False
        self._decision = ""
        self._gap = "none"
        self._metrics: dict = {}

    # ---------- interface shared with GeminiLiveDriver ----------

    def replying(self) -> bool:
        return bool(self._reply_task and not self._reply_task.done())

    def current_question(self) -> Question | None:
        return self.plan[self.q_index] if self.mode == "interview" and self.plan else None

    async def run(self, audio_input_stream: AsyncGenerator[bytes, None]) -> None:
        self._running = True
        warm = [self.llm.warm_up(self._warm_messages())]
        if self.stt is not None and self.stt.available:
            warm.append(asyncio.to_thread(self.stt.warm_up))
        self._warm_task = asyncio.ensure_future(asyncio.gather(*warm, return_exceptions=True))
        if self.speak:
            await asyncio.to_thread(tts.kokoro_model, self.settings)
        if self.on_ready:
            self.on_ready()
        self._reply_task = self._spawn(self._opening())
        async for chunk in audio_input_stream:
            if not self._running:
                break
            if self._recording and len(self._buffer) < MAX_RECORD_BYTES:
                self._buffer.extend(chunk)

    async def handle_user_text_turn(self, text: str, transcript: Transcript | None = None,
                                    turn_id: int | None = None, stt_ms: int | None = None) -> None:
        clean = norm(text)[:4000]
        if not clean:
            return
        await self._cancel_reply(interrupted=True)
        self._snapshots.append((self.q_index, list(self.follow_ups), self.finished))
        question = self.current_question()
        last_model = next((t for t in reversed(self.transcript_history) if t["role"] == "model"), None)
        meta = {"turn_id": turn_id, "source": "voice" if transcript is not None else "text",
                "question": last_model["text"] if last_model else "",
                "question_id": question.id if question else "",
                "competency": question.competency if question else "",
                "answer_kind": ("follow_up" if self.follow_ups else "main") if self.mode == "interview" else "turn",
                "transcript": transcript}
        self.transcript_history.append({"role": "user", "text": clean, "question_id": meta["question_id"],
                                        "kind": meta["answer_kind"]})
        if self.on_turn_complete:
            self.on_turn_complete("user", clean, meta)
        self._metrics = {"turn_id": turn_id, "t0": time.perf_counter(), "stt_ms": stt_ms}
        self._reply_task = self._spawn(self._respond(clean, transcript))

    async def begin_audio_turn(self) -> None:
        await self._cancel_reply(interrupted=True)
        self._buffer = bytearray()
        self._recording = True
        self._stop_preview()
        if self.on_preview and self.stt is not None and self.stt.available:
            self._preview_task = asyncio.create_task(self._preview_loop())

    async def end_audio_stream(self, turn_id: int | None = None) -> None:
        if not self._recording:
            return
        self._recording = False
        self._stop_preview()
        pcm, self._buffer = bytes(self._buffer), bytearray()
        if self.stt is None or not self.stt.available:
            self._error("stt_unavailable", "Speech recognition is not installed on this computer. Type your answer "
                                           "or use the browser's speech recognition.", retryable=False)
            return
        started = time.perf_counter()
        try:
            transcript = await asyncio.to_thread(self.stt.transcribe, pcm)
        except Exception as exc:
            log.warning("STT failed: %s", type(exc).__name__)
            self._error("stt_failed", "Could not recognise speech. Try again or type your answer.")
            return
        stt_ms = round((time.perf_counter() - started) * 1000)
        if not transcript.text.strip():
            if self.on_notice:
                self.on_notice("not_heard", "I didn't catch that. Please try again a little louder or closer to the "
                                            "microphone.")
            return
        if self.on_user_transcript:
            self.on_user_transcript(transcript, turn_id)
        await self.handle_user_text_turn(transcript.text, transcript, turn_id, stt_ms)

    async def redo_answer(self) -> str:
        await self._cancel_reply(interrupted=False)
        if self._snapshots:
            self.q_index, self.follow_ups, self.finished = self._snapshots.pop()
        question = drop_last_answer(self.transcript_history)
        if question:
            self._reply_task = self._spawn(
                self._deliver(self._from_list([content.copy("redo_ack")]), lambda: {"kind": "ack"}, record=False))
        return question

    async def say_silence(self) -> None:
        if not self.replying():
            self._reply_task = self._spawn(
                self._deliver(self._from_list([content.copy("long_silence")]), lambda: {"kind": "wait"}, record=False))

    def stop(self) -> None:
        self._running = False
        self._recording = False
        self._stop_preview()
        for task in (self._reply_task, self._warm_task):
            if task and not task.done():
                task.cancel()

    # ---------- replies ----------

    def _warm_messages(self) -> list[dict]:
        if self.mode == "interview":
            return [{"role": "system", "content": self._p1_system()}, {"role": "user", "content": "warm-up"}]
        return [{"role": "system", "content": self._tutor_system()}, {"role": "user", "content": "warm-up"}]

    def _p1_system(self) -> str:
        # Static for the whole session so the engine can reuse its cache of the system prompt (latency).
        return content.system("p1_interviewer", max_follow_ups=self.max_follow_ups, strictness=self.strictness)

    def _tutor_system(self) -> str:
        preset = content.level_presets().get(self.level, content.level_presets().get("B1", ""))
        return content.system("p5a_tutor", level=self.level, level_preset=preset)

    async def _opening(self) -> None:
        if self.mode == "interview":
            first = self.plan[0]
            text = content.copy("interview_opening", count=len(self.plan), question=first.text)
            meta = {"kind": "question", "question_id": first.id, "thread_id": first.id}
        else:
            text = (content.copy("english_opening_topic", topic=self.topic[:80]) if self.topic
                    else content.copy("english_opening"))
            meta = {"kind": "turn"}
        self._metrics = {"turn_id": None, "t0": time.perf_counter(), "stt_ms": None, "opening": True}
        await self._deliver(self._from_list(_sentences(text)), lambda: meta)

    async def _respond(self, answer: str, transcript: Transcript | None) -> None:
        if self.mode == "interview":
            await self._interview_reply(answer, transcript)
        else:
            await self._tutor_reply()

    async def _interview_reply(self, answer: str, transcript: Transcript | None) -> None:
        question = self.plan[self.q_index]
        words = len(WORD.findall(answer))
        last_model = next((t["text"] for t in reversed(self.transcript_history) if t["role"] == "model"), question.text)
        if self.finished:
            await self._deliver(self._from_list([content.copy("interview_closing")]), lambda: {"kind": "closing"})
            return
        if REPEAT.search(answer) and words <= 12:
            self._metrics["path"] = "fixed"
            await self._deliver(self._from_list([content.copy("repeat_question", question=last_model)]),
                                lambda: {"kind": "repeat", "question_id": question.id, "thread_id": question.id})
            return
        if words < 5:
            self._metrics["path"] = "fixed"
            await self._deliver(self._from_list([content.copy("short_answer")]),
                                lambda: {"kind": "wait", "question_id": question.id, "thread_id": question.id})
            return
        if len(self.follow_ups) >= self.max_follow_ups:
            await self._advance()
            return
        nxt = self.plan[self.q_index + 1] if self.q_index + 1 < len(self.plan) else None
        low = transcript.low_confidence() if transcript else []
        marked = mark_misheard(answer, low)
        user = content.user("p1_interviewer", question=question.text,
                            next_question=nxt.text if nxt else "(This was the last question. Say: Okay.)",
                            follow_up_bank="; ".join(f"{tag}: {text}" for tag, text in question.follow_ups.items()),
                            follow_ups_already_asked="; ".join(self.follow_ups) or "none",
                            transcript=marked, **hints(answer))
        messages = [{"role": "system", "content": self._p1_system()}, {"role": "user", "content": user}]
        self._decision = ""
        self._gap = "none"
        self._metrics["path"] = "model"
        try:
            text = await self._deliver(self._p1_sentences(messages), self._follow_meta, require_text=True)
        except EngineError as exc:
            self._error(exc.code, exc.message, hint=exc.hint)
            text = ""
        if text:
            return
        if self._decision == "follow_up" and self._gap in GAP_TAG and GAP_TAG[self._gap] in question.follow_ups:
            fallback = question.follow_ups[GAP_TAG[self._gap]]          # the model chose a gap but said nothing
            if fallback not in self.follow_ups:
                self.follow_ups.append(fallback)
                await self._deliver(self._from_list([fallback]), self._follow_meta)
                return
        await self._advance()

    def _follow_meta(self) -> dict:
        question = self.plan[self.q_index]
        kind = "wait" if self._decision == "wait" else "follow_up"
        return {"kind": kind, "question_id": question.id, "thread_id": question.id, "gap": self._gap}

    async def _p1_sentences(self, messages: list[dict]) -> AsyncIterator[str]:
        streamer = JsonFieldStreamer()
        pending, said, first = "", [], True
        agen = self.llm.chat_stream(messages, temperature=0.3, max_tokens=160,
                                    json_schema=content.schema("p1_interviewer"))
        try:
            async for delta in agen:
                new = streamer.feed(delta)
                gap = re.search(r'"gap"\s*:\s*"(\w+)"', streamer.buffer)
                if gap:
                    self._gap = gap.group(1)
                if streamer.action == "next_question" and not said:
                    self._decision = "next_question"
                    return                                     # the code asks the next question itself
                if not new:
                    if streamer.say_done:
                        break
                    continue
                pending += new
                while (match := SENTENCE_END.match(pending)) and match.end() < len(pending):
                    sentence = self._clean(match.group(1), first)
                    pending = pending[match.end():]
                    if sentence is None:                       # a repeated follow-up: move on instead
                        self._decision = "next_question" if not said else self._decision
                        return
                    if sentence:
                        first = False
                        said.append(sentence)
                        yield sentence
                        if "?" in sentence:
                            return                             # exactly one question per turn
                if streamer.say_done:
                    break
        finally:
            await agen.aclose()
            self._decision = self._decision or streamer.action or "follow_up"
        rest = self._clean(trim_words(pending.strip(), 30), first) if pending.strip() else ""
        if rest is None:
            if not said:
                self._decision = "next_question"               # never repeat a follow-up
            return
        if rest and self._decision != "next_question":
            said.append(rest)
            yield rest
        if said and self._decision != "wait":
            self.follow_ups.append(" ".join(said))

    def _clean(self, sentence: str, first: bool) -> str | None:
        """Sanitize one interviewer sentence. None when it repeats a follow-up already asked."""
        sentence = TAG_PREFIX.sub("", sentence.strip())
        sentence = sanitize_sentence(sentence, first) if sentence else ""
        if "?" in sentence:
            asked = {norm(q).lower() for f in self.follow_ups for q in _sentences(f) if "?" in q}
            if norm(sentence).lower() in asked:
                return None
        return sentence

    async def _advance(self) -> None:
        nxt = self.plan[self.q_index + 1] if self.q_index + 1 < len(self.plan) else None
        if nxt is None:
            self.finished = True
            await self._deliver(self._from_list(_sentences(content.copy("interview_closing"))),
                                lambda: {"kind": "closing"})
            return
        self.q_index += 1
        self.follow_ups = []
        await self._deliver(self._from_list(["Okay.", nxt.text]),
                            lambda: {"kind": "question", "question_id": nxt.id, "thread_id": nxt.id})

    async def _tutor_reply(self) -> None:
        messages = [{"role": "system", "content": self._tutor_system()}]
        for turn in self.transcript_history[-16:]:
            if turn["role"] == "user":
                messages.append({"role": "user", "content": f"<turn>{turn['text']}</turn>"})
            else:
                messages.append({"role": "assistant", "content": turn["text"]})
        self._metrics["path"] = "model"
        try:
            await self._deliver(self._plain_sentences(messages), lambda: {"kind": "turn"})
        except EngineError as exc:
            self._error(exc.code, exc.message, hint=exc.hint)

    async def _plain_sentences(self, messages: list[dict]) -> AsyncIterator[str]:
        pending, count = "", 0
        agen = self.llm.chat_stream(messages, temperature=0.7, max_tokens=140)
        try:
            async for delta in agen:
                pending += delta
                while (match := SENTENCE_END.match(pending)) and match.end() < len(pending):
                    sentence = match.group(1).strip()
                    pending = pending[match.end():]
                    if sentence:
                        count += 1
                        yield sentence
                        if "?" in sentence or count >= 3:
                            return
        finally:
            await agen.aclose()
        if pending.strip() and count < 3:
            yield pending.strip()

    @staticmethod
    async def _from_list(items: list[str]) -> AsyncIterator[str]:
        for item in items:
            if item.strip():
                yield item.strip()

    async def _deliver(self, sentences: AsyncIterator[str], meta: Callable[[], dict], *, record: bool = True,
                       require_text: bool = False) -> str:
        """Show and speak sentences as they arrive; record the turn (even a cut-off one) at the end."""
        full = ""
        speech: asyncio.Queue = asyncio.Queue()
        voice = asyncio.create_task(self._voice_worker(speech)) if self.speak else None
        started = False
        completed = False
        try:
            async for sentence in sentences:
                if not started:
                    started = True
                    self._metrics.setdefault("first_text_ms", self._ms())
                    if self.on_turn_start:
                        self.on_turn_start("model")
                full = f"{full} {sentence}".strip()
                if self.on_transcript_delta:
                    self.on_transcript_delta("model", sentence, full)
                if voice:
                    for part in _speech_parts(sentence, first=full == sentence):
                        await speech.put(part)
            if voice:
                await speech.put(None)
                await voice
            completed = True
        finally:
            if voice and not voice.done():
                voice.cancel()
            if full:
                info = meta() or {}
                if not completed:
                    info["interrupted"] = True
                if record:
                    self.transcript_history.append({"role": "model", "text": full, **{k: v for k, v in info.items()
                                                                                    if k in ("kind", "question_id")}})
                if self.on_turn_complete:
                    self.on_turn_complete("model", full, info)
            if (full or not require_text) and completed:
                self._emit_metrics()
                if self.on_response_complete:
                    self.on_response_complete()
        return full

    async def _voice_worker(self, speech: asyncio.Queue) -> None:
        while True:
            sentence = await speech.get()
            if sentence is None:
                return
            try:
                pcm = await asyncio.to_thread(tts.synthesize_pcm, sentence, self.voice, self.speed, self.settings)
            except Exception as exc:   # speech is optional: keep the text conversation going
                log.warning("TTS failed: %s", type(exc).__name__)
                continue
            for i in range(0, len(pcm), tts.CHUNK_BYTES):
                self._metrics.setdefault("first_audio_ms", self._ms())
                if self.on_audio_chunk:
                    self.on_audio_chunk(pcm[i:i + tts.CHUNK_BYTES])

    def _ms(self) -> int | None:
        t0 = self._metrics.get("t0")
        return round((time.perf_counter() - t0) * 1000) if t0 else None

    def _emit_metrics(self) -> None:
        if not self.on_metrics or not self._metrics.get("t0"):
            return
        data = {k: v for k, v in self._metrics.items() if k != "t0"}
        data["total_ms"] = self._ms()
        data["model"] = self.llm.model
        self._metrics = {}
        self.on_metrics(data)

    async def _cancel_reply(self, interrupted: bool) -> None:
        task = self._reply_task
        if task and not task.done():
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            if interrupted and self.on_interrupted:
                self.on_interrupted()

    def _spawn(self, coro) -> asyncio.Task:
        """Start a reply; an unexpected failure is reported instead of silently ending the turn."""
        task = asyncio.create_task(coro)

        def done(t: asyncio.Task) -> None:
            if not t.cancelled() and t.exception() is not None:
                log.warning("Reply failed: %r", t.exception())
                self._error("reply_failed", "Mike could not reply. Try again or end the session.")
        task.add_done_callback(done)
        return task

    def _error(self, code: str, message: str, hint: str = "", retryable: bool = True) -> None:
        if self.on_error:
            self.on_error(code, message, hint, retryable)

    # ---------- live captions ----------

    def _stop_preview(self) -> None:
        if self._preview_task and not self._preview_task.done():
            self._preview_task.cancel()
        self._preview_task = None

    async def _preview_loop(self) -> None:
        """Captions while the user speaks: re-read the growing answer about once a second (display only)."""
        window = 16000 * 2 * PREVIEW_SECONDS
        done = 0
        try:
            while self._recording:
                await asyncio.sleep(0.8)
                size = len(self._buffer)
                if size - done < 16000:
                    continue
                done = size
                result = await asyncio.to_thread(self.stt.transcribe_if_idle, bytes(self._buffer[-window:]))
                if result is not None and self._recording and result.text and self.on_preview:
                    self.on_preview(("… " if size > window else "") + result.text)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.info("Live caption skipped: %s", type(exc).__name__)


def _sentences(text: str) -> list[str]:
    parts = [m.group(1).strip() for m in SENTENCE_END.finditer(text)]
    tail = SENTENCE_END.sub("", text).strip()
    return parts + ([tail] if tail else [])


def _speech_parts(sentence: str, first: bool) -> list[str]:
    """Split a long first sentence at its first comma so the first audio starts sooner."""
    if first and len(sentence.split()) > 8 and ", " in sentence:
        head, tail = sentence.split(", ", 1)
        if len(head.split()) >= 2:
            return [head + ",", tail]
    return [sentence]
