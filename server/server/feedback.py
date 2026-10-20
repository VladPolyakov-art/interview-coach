"""Feedback pipeline: the model extracts, code decides (prompts_draft.md §0, feedback_rubric.md).

Every quote the model returns must be an exact substring of what the user said, or it is dropped.
Words the recogniser was unsure about are "possibly misheard": items that touch them are shown as
"Heard as..." and are not counted until the user confirms they said it (GR9, D37 33f).
"""
from __future__ import annotations

import json
import re
import secrets
from typing import Iterable

from . import content
from .engines.base import EngineError, LLMEngine
from .stt import Transcript, Word

# ---------- Counters (HINTS) ----------

FIRST_PERSON = re.compile(r"\b(I|I've|I'd|I'm|me|my)\b")
FIRST_PERSON_ACTION = re.compile(r"\bI\s+(?:\w+ly\s+)?(?!am\b|was\b|think\b|guess\b|mean\b)\w+", re.I)
WE_ACTION = re.compile(r"\b(we|the team|our team|they)\s+(?!are\b)\w+|\b(was|were)\s+\w+ed\b", re.I)
NUMBER = re.compile(r"\d|\b(percent|half|double|twice|triple|one|two|three|four|five|six|seven|eight|nine|ten|"
                    r"hundred|thousand|million)\b", re.I)
WORD = re.compile(r"[A-Za-z0-9']+")


def hints(text: str) -> dict:
    return {"n_i": len(FIRST_PERSON_ACTION.findall(text)), "n_we": len(WE_ACTION.findall(text)),
            "has_number": "true" if NUMBER.search(text) else "false", "n_words": len(WORD.findall(text))}


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def is_quote(fragment: str, source: str) -> bool:
    fragment = norm(fragment)
    return bool(fragment) and fragment in norm(source)


def mark_misheard(text: str, low: Iterable[Word]) -> str:
    """Wrap low-confidence words as [?word?] for the prompts (each occurrence once, left to right)."""
    out = text
    pos = 0
    for word in low:
        token = word.w.strip(" .,!?;:\"'")
        if not token:
            continue
        match = re.compile(r"\b" + re.escape(token) + r"\b").search(out, pos)
        if match:
            out = out[:match.start()] + f"[?{token}?]" + out[match.end():]
            pos = match.start() + len(token) + 4
    return out


def low_tokens(low: Iterable[Word]) -> set[str]:
    return {w.w.strip(" .,!?;:\"'").lower() for w in low if w.w.strip(" .,!?;:\"'")}


# ---------- Interviewer reply guards (P1) ----------

PRAISE = re.compile(r"\b(great|excellent|perfect|good answer|well done|amazing|fantastic|awesome|brilliant)\b", re.I)
SENTENCE = re.compile(r"[^.!?]+[.!?]*")


def sanitize_sentence(sentence: str, first: bool) -> str:
    """The interviewer never praises: a praising lead-in sentence becomes "Okay."."""
    if PRAISE.search(sentence):
        if "?" in sentence:
            return PRAISE.sub("", sentence).replace("  ", " ").strip(" ,!") or "Okay."
        return "Okay." if first else ""
    return sentence


def trim_words(text: str, limit: int = 30) -> str:
    if len(WORD.findall(text)) <= limit:
        return text
    questions = [s.strip() for s in SENTENCE.findall(text) if "?" in s]
    return questions[-1] if questions else " ".join(text.split()[:limit])


class JsonFieldStreamer:
    """Incrementally read `action` and the `say` string from a streaming JSON reply.

    Schema order is gap, action, say, so `action` is known before `say` starts; this lets the server
    speak the first sentence while the model is still writing (latency target D33).
    """

    ACTION = re.compile(r'"action"\s*:\s*"(\w+)"')
    SAY = re.compile(r'"say"\s*:\s*"')

    def __init__(self) -> None:
        self.buffer = ""
        self.action: str | None = None
        self.say = ""
        self.say_done = False
        self._pos: int | None = None

    def feed(self, delta: str) -> str:
        """Add model output; return the newly decoded part of `say`."""
        self.buffer += delta
        if self.action is None:
            match = self.ACTION.search(self.buffer)
            if match:
                self.action = match.group(1)
        if self._pos is None:
            match = self.SAY.search(self.buffer)
            if not match:
                return ""
            self._pos = match.end()
        if self.say_done:
            return ""
        out = []
        i = self._pos
        buf = self.buffer
        while i < len(buf):
            ch = buf[i]
            if ch == '"':
                self.say_done = True
                i += 1
                break
            if ch == "\\":
                if i + 1 >= len(buf):
                    break
                nxt = buf[i + 1]
                if nxt == "u":
                    if i + 6 > len(buf):
                        break
                    try:
                        out.append(chr(int(buf[i + 2:i + 6], 16)))
                    except ValueError:
                        pass
                    i += 6
                    continue
                out.append({"n": " ", "t": " ", "r": "", '"': '"', "\\": "\\", "/": "/"}.get(nxt, nxt))
                i += 2
                continue
            out.append(ch)
            i += 1
        self._pos = i
        text = "".join(out)
        self.say += text
        return text


# ---------- Language layer (P2b interview, P5b English track) ----------

TAG_WORDS = [("tense", r"tense|past|present|future"), ("article", r"\barticle|\bthe\b|\ba\b|\ban\b"),
             ("preposition", r"preposition|\babout\b|\bon\b|\bin\b|\bat\b|\bfor\b|\bto\b"),
             ("collocation", r"usual verb|collocation|pairing|goes with"),
             ("word_choice", r"word|means|vague|formal|informal")]
CLASS_SEVERITY = {"M": 3, "N": 2, "C": 1}
DIGITS = re.compile(r"\d+(?:[.,]\d+)?")


def language_tag(item: dict) -> str:
    if item.get("class") == "M":
        return "meaning_error"
    reason = (item.get("reason") or "").lower()
    for tag, pattern in TAG_WORDS:
        if re.search(pattern, reason):
            return tag
    return "word_choice"


def validate_language_items(items: list, transcript: str, known: Iterable[str], low: set[str],
                            ignored: Iterable[str] = (), max_items: int = 3) -> list[dict]:
    known_low = {k.lower() for k in known}
    ignored_low = {i.lower() for i in ignored}
    out = []
    for raw in items or []:
        if not isinstance(raw, dict):
            continue
        original = norm(str(raw.get("original", "")))
        better = raw.get("better") or []
        if isinstance(better, str):
            better = [better]
        better = [norm(str(b)) for b in better if norm(str(b))][:3]
        if not original or "[?" in original or not is_quote(original, transcript):
            continue                                   # hallucination guard
        if not better or better[0].lower() == original.lower():
            continue
        if DIGITS.findall(better[0]) != DIGITS.findall(original):
            continue                                   # a "better" version must not change numbers
        words = {w.lower() for w in WORD.findall(original)}
        if words & known_low or original.lower() in ignored_low:
            continue                                   # domain terms are never errors
        klass = raw.get("class") if raw.get("class") in CLASS_SEVERITY else "N"
        misheard = bool(words & low)
        out.append({
            "id": "f" + secrets.token_hex(4), "layer": "language", "tag": language_tag(raw),
            "original": original, "heard_as": original, "better": better,
            "reason": norm(str(raw.get("reason", "")))[:200],
            "level": raw.get("level") if raw.get("level") in ("A2", "B1", "B2", "C1") else "",
            "class": klass, "severity": CLASS_SEVERITY[klass],
            "possibly_misheard": misheard,
            "status": "unconfirmed" if misheard else "active",
        })
    out.sort(key=lambda f: -f["severity"])
    return out[:max_items]


def language_layer(items: list[dict]) -> dict:
    counted = [f for f in items if f["status"] in ("active", "confirmed")]
    shown = [f for f in counted if f["severity"] >= 2] or counted
    top = shown[0] if shown else None
    misheard = sum(1 for f in items if f["status"] == "unconfirmed")
    return {"layer": "language", "status": "fix" if top else "ok", "severity": top["severity"] if top else 0,
            "tag": top["tag"] if top else "", "fix": (f"Say: \"{top['better'][0]}\"" if top else "Nothing to fix here."),
            "reason": top["reason"] if top else "", "items": items, "possibly_misheard": misheard}


async def analyze_language(llm: LLMEngine, transcript: str, *, level: str, known: list[str], low: list[Word],
                           english_track: bool = False, ignored: Iterable[str] = ()) -> dict:
    marked = mark_misheard(transcript, low)
    prompt_id = "p5b_corrections" if english_track else "p2b_language"
    messages = [{"role": "system", "content": content.system(prompt_id)},
                {"role": "user", "content": content.user(prompt_id, level=level or "unknown",
                                                         known_terms=", ".join(known) or "none", transcript=marked)}]
    data = await llm.complete_json(messages, content.schema(prompt_id), temperature=0.1, max_tokens=350)
    raw_items = data.get("corrections" if english_track else "items") or []
    items = validate_language_items(raw_items, transcript, known, low_tokens(low), ignored,
                                    max_items=2 if english_track else 3)
    layer = language_layer(items)
    if english_track:
        keep = data.get("phrase_to_keep")
        if isinstance(keep, dict) and keep.get("phrase"):
            layer["phrase_to_keep"] = {"phrase": norm(str(keep["phrase"]))[:200], "why": norm(str(keep.get("why", "")))[:200]}
        else:
            layer["phrase_to_keep"] = None
        if not items:
            layer["fix"] = "No corrections this turn."
    return layer


# ---------- Content layer (P2a) ----------

CONTENT_FIX = {
    "no_result": "Finish with what happened: one result, ideally a number.",
    "no_star_action": "Say what you did, step by step, not only what the situation was.",
    "we_not_i": "Switch 'we' to 'I' for the steps you personally did.",
    "we_mixed": "Say which part was yours.",
    "vague_result": "Replace 'it went well' with something you can count or compare.",
    "off_topic": "Answer the question in your first sentence, then add background.",
    "no_reflection": "End with one thing you would do differently.",
}


def content_from_model(data: dict, *, question: str, competency: str, transcript: str, n_i: int, n_we: int) -> dict:
    hypothetical = competency == "H"
    voice = data.get("voice", "none")
    if voice == "i" and n_i == 0 and n_we > 0:
        voice = "we"                                   # trust the counters over the model
    issues: list[tuple[int, str]] = []                 # (severity, tag) in check order
    if data.get("relevant") is False:
        issues.append((3, "off_topic"))
    if not hypothetical:
        if not data.get("action"):
            issues.append((3, "no_star_action"))
        if not data.get("result") or data.get("result_type") == "none":
            issues.append((3, "no_result"))
        if voice == "we":
            issues.append((3, "we_not_i") if n_i == 0 else (2, "we_not_i"))
        elif voice == "mixed":
            issues.append((1, "we_mixed"))
        if data.get("result_type") == "vague" and data.get("result"):
            issues.append((2, "vague_result"))
    if not data.get("reflection") and (competency == "F" or "differently" in question.lower()):
        issues.append((2, "no_reflection"))
    evidence = str(data.get("evidence") or "")
    praise = str(data.get("praise") or "")
    evidence = norm(evidence) if is_quote(evidence, transcript) else ""
    praise = norm(praise) if is_quote(praise, transcript) else ""
    top = max(issues, key=lambda item: item[0]) if issues else None   # max keeps the first on ties
    if top and top[0] >= 2:
        tag = top[1]
        fix = CONTENT_FIX["we_mixed"] if tag == "we_not_i" and top[0] == 2 else CONTENT_FIX[tag]
        return {"layer": "content", "status": "fix", "severity": top[0], "tag": tag, "fix": fix,
                "evidence": evidence, "praise": praise,
                "tips": [CONTENT_FIX[t] for s, t in issues if s == 1],
                "missing": [t for s, t in issues if s >= 2]}
    fix = "Nothing to fix here." + (f" Strong: \"{praise}\"" if praise else "")
    return {"layer": "content", "status": "ok", "severity": 0, "tag": "", "fix": fix, "evidence": "",
            "praise": praise, "tips": [CONTENT_FIX[t] for s, t in issues if s == 1], "missing": []}


async def analyze_content(llm: LLMEngine, *, question: str, competency: str, transcript: str,
                          low: list[Word]) -> dict:
    h = hints(transcript)
    messages = [{"role": "system", "content": content.system("p2a_content")},
                {"role": "user", "content": content.user("p2a_content", question=question,
                                                         competency=competency or "unknown",
                                                         transcript=mark_misheard(transcript, low), **h)}]
    data = await llm.complete_json(messages, content.schema("p2a_content"), temperature=0.1, max_tokens=250)
    return content_from_model(data, question=question, competency=competency, transcript=transcript,
                              n_i=h["n_i"], n_we=h["n_we"])


# ---------- Delivery layer (code only, rubric §4) ----------

FILLERS = re.compile(r"\b(um+|uh+|erm+|you know|basically|actually|kind of|sort of)\b|\blike,", re.I)
# Delivery talks only about how the answer sounded: length, pace, fillers, pauses. What to say is the content
# layer's job, so these tips never mention actions, results or structure.
DELIVERY_TIP = {
    "pace_fast": "Slow down at the end of each sentence; a short stop helps you and the listener.",
    "pace_slow": "Your pace was slow. Prepare the first sentence so you can start smoothly.",
    "too_long": "Long answer. Aim for one to two minutes, then stop and let the interviewer ask.",
    "too_short": "Short answer. Main answers usually take one to two minutes out loud.",
    "filler_high": "Replace 'um' with a silent pause. Try 'let me think' once at the start.",
    "long_pauses": "When you stall, use a phrase: 'The key point is...'",
    "restarts": "Plan your first five words: 'In my last project, I...'",
}
# Typed answers: only length can be judged, and it is shown as words, not minutes.
DELIVERY_TIP_TEXT = {
    "too_long": "Long for a spoken answer. Main answers are usually 150 to 350 words.",
    "too_short": "Short for a spoken answer. Main answers are usually 150 to 350 words.",
}
# Typed answers are naturally shorter than spoken ones, so text mode only flags clearly short or long answers
# (🟡 tune with real sessions). Voice mode keeps the rubric bands in seconds.
TEXT_WORDS_S2 = (25, 420)
TEXT_WORDS_S3 = (12, 560)


def _band(value: float, s2: tuple, s3: tuple) -> int:
    lo2, hi2 = s2
    lo3, hi3 = s3
    if value < lo3 or value > hi3:
        return 3
    if value < lo2 or value > hi2:
        return 2
    return 0


def delivery_layer(text: str, transcript: Transcript | None, *, main_answer: bool = True) -> dict:
    words = WORD.findall(text)
    n_words = len(words)
    fillers = len(FILLERS.findall(text))
    fillers_per_100 = round(fillers * 100 / n_words, 1) if n_words else 0.0
    restarts = sum(1 for a, b in zip(words, words[1:]) if a.lower() == b.lower() and a.isalpha())
    metrics: dict = {"words": n_words, "fillers": fillers, "fillers_per_100w": fillers_per_100,
                     "restarts": restarts, "fillers_note": "Fillers may be undercounted by the recogniser."}
    issues: list[tuple[int, str]] = []
    voice = transcript is not None and bool(transcript.words)
    if voice:
        ws = transcript.words
        span = max(0.1, ws[-1].end - ws[0].start)
        pauses = sum(1 for a, b in zip(ws, ws[1:]) if b.start - a.end >= 2.5)
        wpm = round(len(ws) / (span / 60))
        metrics.update({"seconds": round(span, 1), "wpm": wpm, "long_pauses": pauses, "mode": "voice"})
        if n_words >= 15:
            sev = _band(wpm, (95, 175), (80, 195))
            if sev:
                issues.append((sev, "pace_fast" if wpm > 160 else "pace_slow"))
        if main_answer:
            sev = _band(span, (30, 180), (15, 240))
            if sev:
                issues.append((sev, "too_long" if span > 150 else "too_short"))
        if pauses >= 2:
            issues.append((3 if pauses >= 4 else 2, "long_pauses"))
        if fillers_per_100 >= 4 and n_words >= 20:
            issues.append((3 if fillers_per_100 >= 8 else 2, "filler_high"))
    else:
        metrics.update({"seconds": None, "wpm": None, "long_pauses": None, "mode": "text",
                        "not_available": ["pace", "fillers", "pauses"]})
        if main_answer:
            sev = _band(n_words, TEXT_WORDS_S2, TEXT_WORDS_S3)
            if sev:
                issues.append((sev, "too_long" if n_words > TEXT_WORDS_S2[1] else "too_short"))
    if voice and restarts >= 3:                        # repeated words are a speech habit, not a typing one
        issues.append((3 if restarts >= 6 else 2, "restarts"))
    top = max(issues, key=lambda item: item[0]) if issues else None
    tips = DELIVERY_TIP if voice else {**DELIVERY_TIP, **DELIVERY_TIP_TEXT}
    return {"layer": "delivery", "status": "fix" if top else "ok", "severity": top[0] if top else 0,
            "tag": top[1] if top else "", "fix": tips[top[1]] if top else "Nothing to fix here.",
            "metrics": metrics}


def cascade_note(layers: dict) -> str:
    c, d = layers.get("content") or {}, layers.get("delivery") or {}
    if c.get("severity", 0) >= 2 and d.get("severity", 0) >= 2:
        return "Likely cause: content. Fix the content first."
    return ""


# ---------- Stronger version (P2c) ----------

async def stronger_version(llm: LLMEngine, *, question: str, missing: list[str], transcript: str) -> dict:
    messages = [{"role": "system", "content": content.system("p2c_stronger")},
                {"role": "user", "content": content.user("p2c_stronger", question=question,
                                                         missing=", ".join(missing) or "none",
                                                         transcript=transcript)}]
    data = await llm.complete_json(messages, content.schema("p2c_stronger"), temperature=0.2, max_tokens=300)
    rewrite = norm(str(data.get("rewrite", "")))
    allowed = set(DIGITS.findall(transcript))
    if any(n not in allowed for n in DIGITS.findall(rewrite)):
        raise EngineError("invented_number", "The rewrite contained a number that was not in the answer.")
    if not rewrite:
        raise EngineError("invalid_json", "Empty rewrite.")
    return {"rewrite": rewrite, "placeholders": [norm(str(p)) for p in data.get("placeholders") or []][:6]}


# ---------- Debrief (P3) ----------

def counted_tags(record: dict) -> list[tuple[str, str, int]]:
    """(layer, tag, severity) of S2+ items that count: dismissed and unconfirmed flags never count."""
    out = []
    layers = record.get("layers") or {}
    for name in ("content", "delivery"):
        layer = layers.get(name) or {}
        if layer.get("severity", 0) >= 2 and layer.get("tag") and not layer.get("dismissed"):
            out.append((name, layer["tag"], layer["severity"]))
    for flag in (layers.get("language") or {}).get("items", []):
        if flag.get("status") in ("active", "confirmed") and flag.get("severity", 0) >= 2:
            out.append(("language", flag.get("tag", ""), flag["severity"]))
    return out


def debrief_records(feedback: list[dict]) -> list[str]:
    lines = []
    for i, record in enumerate(feedback, 1):
        parts = [f"q{i}", record.get("competency") or "-"]
        for layer, tag, sev in counted_tags(record):
            parts.append(f"{layer}:{tag}(S{sev})")
        metrics = ((record.get("layers") or {}).get("delivery") or {}).get("metrics") or {}
        if metrics.get("wpm"):
            parts.append(f"pace={metrics['wpm']}wpm, fillers/100w={metrics.get('fillers_per_100w')}, "
                         f"length={metrics.get('seconds')}s")
        lines.append(" | ".join(parts))
    return lines


def fallback_debrief(feedback: list[dict], layer_order: str) -> dict:
    counts: dict[tuple[str, str], list[str]] = {}
    for i, record in enumerate(feedback, 1):
        for layer, tag, _sev in counted_tags(record):
            counts.setdefault((layer, tag), []).append(f"q{i}")
    ranked = sorted(counts.items(), key=lambda kv: -len(kv[1]))
    spots, used = [], set()
    for (layer, tag), evidence in ranked:
        if layer in used:
            continue
        used.add(layer)
        text = CONTENT_FIX.get(tag) or DELIVERY_TIP.get(tag) or f"Work on {tag.replace('_', ' ')}."
        spots.append({"layer": layer, "tag": tag, "text": text, "evidence": evidence})
    order = ["content", "language", "delivery"] if layer_order == "content-first" else ["delivery", "content", "language"]
    spots.sort(key=lambda s: order.index(s["layer"]))
    verdict = ("You finished the practice round. " + (f"The main thing to fix: {spots[0]['text'].rstrip('.')}."
                                                       if spots else "No repeated problem stood out."))
    return {"verdict": verdict, "weak_spots": spots[:3], "strength": "",
            "next_step": f"Practise the {spots[0]['layer']} layer next." if spots else "Try a harder round next.",
            "source": "template"}


async def debrief(llm: LLMEngine | None, feedback: list[dict], *, layer_order: str, past: str = "none") -> dict:
    scored = [f for f in feedback if (f.get("layers") or {}).get("content") or (f.get("layers") or {}).get("language")]
    if len(scored) < 3:
        result = fallback_debrief(scored, layer_order)
        result.update({"verdict": "This session was too short for a full debrief: answer at least 3 questions "
                                  "to get one.", "too_short": True})
        return result
    if llm is None:
        return fallback_debrief(scored, layer_order)
    records = debrief_records(scored)
    messages = [{"role": "system", "content": content.system("p3_debrief")},
                {"role": "user", "content": content.user("p3_debrief", layer_order=layer_order, count=len(scored),
                                                         records="\n".join(records), past_weak_spots=past)}]
    try:
        data = await llm.complete_json(messages, content.schema("p3_debrief"), temperature=0.2, max_tokens=450)
    except EngineError:
        return fallback_debrief(scored, layer_order)
    known_tags = {tag for r in scored for _l, tag, _s in counted_tags(r)}
    spots = [s for s in data.get("weak_spots") or [] if isinstance(s, dict) and s.get("tag") in known_tags]
    for spot in spots:   # code owns the advice for known tags; the model only ranks and words the verdict
        canonical = CONTENT_FIX.get(spot["tag"]) or DELIVERY_TIP.get(spot["tag"])
        if canonical:
            spot["text"] = canonical
    order = ["content", "language", "delivery"] if layer_order == "content-first" else ["delivery", "content", "language"]
    spots.sort(key=lambda s: order.index(s["layer"]) if s.get("layer") in order else 9)
    if not spots and known_tags:
        spots = fallback_debrief(scored, layer_order)["weak_spots"]
    verdict = PRAISE.sub("solid", norm(str(data.get("verdict", "")))) or fallback_debrief(scored, layer_order)["verdict"]
    return {"verdict": verdict, "weak_spots": spots[:3], "strength": norm(str(data.get("strength", ""))),
            "next_step": norm(str(data.get("next_step", ""))), "source": "model"}


# ---------- Answer suggester (practice only, D35) ----------

async def suggest_answer(llm: LLMEngine, *, question: str, history: list[dict], profile: str, jd: str,
                         level: str) -> dict:
    recent = "\n".join(f"{'Candidate' if t['role'] == 'user' else 'Interviewer'}: {t['text']}" for t in history[-7:-1])
    messages = [{"role": "system", "content": content.system("suggester", level=level)},
                {"role": "user", "content": content.user("suggester", profile=profile[:12000] or "(no profile yet)",
                                                         jd=jd[:5000] or "(none)", history=recent or "(start)",
                                                         question=json.dumps(question))}]
    data = await llm.complete_json(messages, content.schema("suggester"), temperature=0.4, max_tokens=350)
    answer = norm(str(data.get("answer", "")))
    if not answer:
        raise EngineError("invalid_json", "Empty suggestion.")
    return {"story": norm(str(data.get("story", "")))[:120], "answer": answer[:1500],
            "points": [norm(str(p))[:80] for p in data.get("points") or []][:4]}


# ---------- Flag actions (GR9: confirm / dismiss "possibly misheard" and other language items) ----------

FLAG_ACTIONS = {"confirm": "confirmed", "dismiss": "dismissed", "restore": "active"}


def apply_flag_action(record: dict, flag_id: str, action: str) -> dict:
    """Change one language flag's status and recompute the language layer summary. KeyError if unknown."""
    if action not in FLAG_ACTIONS:
        raise ValueError("unknown_action")
    layer = (record.get("layers") or {}).get("language")
    if not layer:
        raise KeyError(flag_id)
    items = layer.get("items") or []
    flag = next((f for f in items if f.get("id") == flag_id), None)
    if flag is None:
        raise KeyError(flag_id)
    if action == "restore":
        flag["status"] = "unconfirmed" if flag.get("possibly_misheard") else "active"
    else:
        flag["status"] = FLAG_ACTIONS[action]
    extra = {k: v for k, v in layer.items() if k == "phrase_to_keep"}
    record["layers"]["language"] = {**language_layer(items), **extra}
    return flag
