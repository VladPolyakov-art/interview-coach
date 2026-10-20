# Session WebSocket protocol

Endpoint: `ws://127.0.0.1:8000/ws/session` (alias `/ws/voice`).
Source of truth: `server/ws.py` (socket loop), `server/session.py` (local interviewer), `server/feedback.py`
(feedback records). This document describes protocol version 1 (`data_version: 1`).

## Connection rules

- **Origin check.** A browser page must come from the same host as the server, or from a dev origin
  (`http://localhost:5173`, `http://127.0.0.1:5173`; override with `IC_DEV_ORIGINS`). Other origins are closed
  with code `1008` before `accept`. Clients that send no `Origin` header (CLI, tests) are allowed.
- **First message** must be `start` within 30 s, otherwise the server sends `error` `bad_start` and closes.
- **Frames.** JSON text frames for control and events. Binary frames carry audio:
  - client to server: 16 kHz mono signed 16-bit little-endian PCM, at most 65,536 bytes per frame, even length;
  - server to client: 24 kHz mono signed 16-bit little-endian PCM (Kokoro or Gemini Live), 9,600-byte frames
    (0.2 s), played in order. Audio belongs to the current Mike turn (between `turn_start` and `response_complete`).
- **Limits.** A JSON frame is at most 12,000 characters; a typed turn at most 4,000 characters; an answer is
  recorded for at most 4 minutes. A violation ends the session with `error` `session_failed` (the transcript so
  far is still saved).
- **Save on exit.** When the socket closes for any reason, the server saves the session if the user answered at
  least once, then computes the debrief. If the socket is still open it sends `saving`, `session_saved`,
  `debrief_pending` and `debrief`, then closes.

## Client to server

### `start` (required, first)

```json
{
  "type": "start",
  "mode": "interview",
  "round_type": "mix",
  "questions": 5,
  "strictness": 2,
  "level": "B1",
  "input": "voice",
  "vacancy_id": "v-20261020-101500-a1b2c3",
  "voice": "am_michael",
  "speak": true,
  "suggest": false,
  "topic": "",
  "engine": "ollama"
}
```

| Field | Values | Default |
|---|---|---|
| `mode` | `interview`, `english` | `interview` |
| `round_type` | `hr`, `behavioural`, `mix` (interview only) | `mix` |
| `questions` | 1 to 10 main questions | settings `questions_per_session` |
| `strictness` | 1 gentle, 2, 3 demanding (follow-ups per question: 1, 2, 2) | settings |
| `level` | `A2`, `B1`, `B2`, `C1` (`B1+` is read as `B1`) | settings |
| `input` | `voice` (server recognises speech), `browser_stt` (client sends recognised text), `text` | `voice` |
| `vacancy_id` | id from `GET /api/vacancies`; its generated questions come first | none |
| `voice` | Kokoro voice id from `GET /api/voices` | settings, else `am_michael` |
| `speak` | `false` for text-only replies | `true` (ignored when Kokoro is not installed) |
| `suggest` | turn the answer suggester on (only if settings `answer_suggester` is true) | `false` |
| `topic` | English mode: conversation topic, up to 80 characters | none |
| `engine` | override the selected engine for this session | settings `engine` |

### Voice answer (`input: "voice"`)

```json
{"type": "activity_start", "turn_id": 3}
```
Then binary PCM frames, then:
```json
{"type": "audio_stream_end"}
```
`activity_start` interrupts Mike if he is speaking (barge-in: the server sends `interrupted` and records the
cut-off line). `turn_id` is a non-negative integer chosen by the client; it is echoed in `speech_preview`,
`user_transcript`, `turn_complete` and `feedback_pending`.

### Typed or browser-recognised answer

```json
{"type": "user_turn", "text": "In my last role I led the redesign of the onboarding flow.", "turn_id": 4, "source": "browser_stt"}
```

### Other client messages

```json
{"type": "redo_answer"}
{"type": "suggest", "on": true}
{"type": "request_stronger", "feedback_id": "fb-1a2b3c4d"}
{"type": "flag_action", "feedback_id": "fb-1a2b3c4d", "flag_id": "f9e8d7c6", "action": "confirm"}
{"type": "silence"}
{"type": "ping", "t": 1771234567890}
{"type": "end_session"}
```

- `redo_answer`: drop the last answer (and Mike's reply to it); Mike says "Sure, go ahead." and the same question
  is open again. Feedback for the dropped answer is removed.
- `flag_action` `action`: `confirm` (I did say that: the item now counts), `dismiss` (not an error, or misheard:
  never counted, and the same phrase is not flagged again this session), `restore`.
- `silence`: the user has been quiet for a long time; Mike says only "Take your time." (local engines).
- `end_session`: finish normally; the server saves and debriefs.

## Server to client

### Session lifecycle

```json
{"type": "session_started", "session_id": "s-20261020-101530-4f5e6d", "mode": "interview", "engine": "ollama",
 "model": "qwen3:8b", "speaks": true,
 "questions": [{"id": "A1", "competency": "A", "text": "Why are you interested in this role?",
                "follow_ups": [{"tag": "YP", "text": "..."}], "source": "bank", "anchor": ""}],
 "audio": {"sample_rate_out": 24000, "sample_rate_in": 16000},
 "stt": {"available": true, "backend": "mlx", "model": "mlx-community/whisper-large-v3-turbo"},
 "suggester_available": true, "suggest": false, "warnings": []}
{"type": "ready"}
```
`ready` comes when speech is loaded; the opening line follows at once. The model warms up in the background.

### Turns

```json
{"type": "turn_start", "speaker": "model"}
{"type": "transcript_delta", "speaker": "model", "delta": "Okay.", "full_text": "Okay."}
{"type": "turn_complete", "speaker": "model", "full_text": "Okay. What was the result of that launch?",
 "kind": "follow_up", "question_id": "B2", "thread_id": "B2"}
{"type": "response_complete"}
{"type": "interrupted"}
```
- Mike's text arrives sentence by sentence (`delta` is one sentence, `full_text` the turn so far). With Gemini Live,
  deltas are transcription fragments and user deltas also arrive (`speaker: "user"`).
- `kind`: `question` (a main question), `follow_up`, `wait` (asks the user to go on), `repeat`, `closing`,
  `ack` (not recorded in the transcript), `turn` (English mode). `interrupted: true` marks a cut-off line.
- `thread_id` groups a main question with its follow-ups.

User side (voice input):
```json
{"type": "speech_preview", "turn_id": 3, "text": "In my last role I led the"}
{"type": "user_transcript", "turn_id": 3, "text": "In my last role I led the redesign.", "backend": "mlx",
 "low_conf": [{"w": "redesign", "start": 2.1, "end": 2.6, "p": 0.38}]}
{"type": "turn_complete", "speaker": "user", "full_text": "In my last role I led the redesign.", "turn_id": 3}
{"type": "notice", "code": "not_heard", "message": "I didn't catch that. Please try again a little louder or closer to the microphone."}
```
`speech_preview` is display-only. `low_conf` lists words below 0.5 recogniser confidence ("possibly misheard").

```json
{"type": "turn_metrics", "turn_id": 3, "stt_ms": 640, "path": "model", "first_text_ms": 820,
 "first_audio_ms": 1190, "total_ms": 2950, "model": "qwen3:8b"}
```
`path`: `model` (the model chose the reply) or `fixed` (code reply without a model call). Times are measured from
the moment the server has the user's text.

### Feedback (one record per answer of 5 words or more)

```json
{"type": "feedback_pending", "feedback_id": "fb-1a2b3c4d", "turn_id": 3}
{"type": "feedback", "feedback": {
  "id": "fb-1a2b3c4d", "turn_id": 3, "question": "Tell me about a project you owned.", "question_id": "B1",
  "competency": "B", "answer_kind": "main", "answer": "Last year we has redesigned ...", "source": "voice",
  "created_at": "2026-10-20T10:16:02+02:00", "complete": true, "cascade": "",
  "heard_as_words": [{"w": "has", "start": 1.0, "end": 1.2, "p": 0.31}],
  "layers": {
    "delivery": {"layer": "delivery", "status": "ok", "severity": 0, "tag": "", "fix": "Nothing to fix here.",
                 "metrics": {"words": 62, "fillers": 1, "fillers_per_100w": 1.6, "restarts": 0, "seconds": 31.0,
                             "wpm": 120, "long_pauses": 0, "mode": "voice",
                             "fillers_note": "Fillers may be undercounted by the recogniser."}},
    "language": {"layer": "language", "status": "ok", "severity": 0, "tag": "", "fix": "Nothing to fix here.",
                 "reason": "", "possibly_misheard": 1,
                 "items": [{"id": "f9e8d7c6", "layer": "language", "tag": "tense", "original": "we has redesigned",
                            "heard_as": "we has redesigned", "better": ["we redesigned"], "reason": "Past tense here.",
                            "level": "B1", "class": "N", "severity": 2, "possibly_misheard": true,
                            "status": "unconfirmed"}]},
    "content": {"layer": "content", "status": "fix", "severity": 3, "tag": "no_result",
                "fix": "Finish with what happened: one result, ideally a number.", "evidence": "", "praise": "",
                "tips": ["Say which part was yours."], "missing": ["no_result"]}
  }}}
{"type": "feedback_unavailable", "feedback_id": "fb-1a2b3c4d", "code": "ollama_not_running",
 "message": "Feedback is not available for this answer. Your answer is still saved."}
```
- The same record is sent several times as layers fill in: delivery first (computed in code, instant), then
  language, then content (interview only). `complete: true` marks the last one. Replace the record by `id`.
- A layer that failed is `{"layer": "content", "status": "unavailable", "code": "timeout"}`.
- Language item `status`: `active` (counts), `unconfirmed` (touches a possibly misheard word: shown as
  "Heard as ...", not counted until confirmed), `confirmed`, `dismissed`. Only `active` and `confirmed` items with
  severity 2 or 3 count in the debrief.
- In English mode the language layer may carry `"phrase_to_keep": {"phrase": "...", "why": "..."}`.
- Delivery `metrics.mode` is `text` for typed answers, with `"not_available": ["pace", "fillers", "pauses"]`.
- On engines that run one local model (Ollama, a local OpenAI-compatible server), feedback waits until Mike has
  finished replying, so it never slows down the interview.

```json
{"type": "flag_updated", "feedback_id": "fb-1a2b3c4d", "flag": {"id": "f9e8d7c6", "status": "confirmed", "...": "..."},
 "language": {"layer": "language", "status": "fix", "...": "..."}}
{"type": "stronger_version", "feedback_id": "fb-1a2b3c4d", "rewrite": "Last year I redesigned ... [result].",
 "placeholders": ["[result]"]}
{"type": "stronger_unavailable", "feedback_id": "fb-1a2b3c4d", "code": "invented_number", "message": "..."}
{"type": "answer_reset", "question": "Tell me about a project you owned.", "removed_feedback_ids": ["fb-1a2b3c4d"]}
```

### Answer suggester (practice only, when enabled)

```json
{"type": "suggestion_pending", "question": "Why are you interested in this role?"}
{"type": "suggestion", "question": "Why are you interested in this role?", "story": "Onboarding redesign",
 "answer": "In my last role I ...", "points": ["own part", "result"]}
{"type": "suggestion_unavailable", "question": "...", "code": "invalid_json", "message": "Could not prepare a suggestion for this question."}
```

### End of session

```json
{"type": "saving"}
{"type": "session_saved", "session_id": "s-20261020-101530-4f5e6d"}
{"type": "debrief_pending", "session_id": "s-20261020-101530-4f5e6d"}
{"type": "debrief", "session_id": "s-20261020-101530-4f5e6d", "debrief": {
  "verdict": "You answered clearly, but most stories stopped before the result.",
  "weak_spots": [{"layer": "content", "tag": "no_result", "text": "Finish each story with a result.", "evidence": ["q1", "q3"]}],
  "strength": "Clear structure.", "next_step": "Practise ending with a number.", "source": "model"}}
{"type": "session_ended", "saved": false, "reason": "no_answers"}
{"type": "save_error", "code": "save_failed", "message": "Could not save the session. Copy the transcript before leaving this page."}
```
- With fewer than 3 answers the debrief has `"too_short": true` and a fixed verdict.
- `source`: `model` or `template` (fallback built in code when the model is unavailable).

### Errors

```json
{"type": "error", "code": "not_running", "message": "Ollama is installed but not running.",
 "hint": "Open the Ollama app, or run: ollama serve", "retryable": true, "hint_command": "ollama serve",
 "fix_url": "https://ollama.com/download", "engine": "ollama"}
```

| Code | When |
|---|---|
| `bad_start` | first message missing or invalid (`message` names the field) |
| `not_installed`, `not_running`, `no_model`, `not_configured`, `unreachable`, `unauthorized`, `billing_required` | engine not ready at start (same codes as `GET /api/engines`) |
| `ollama_not_running`, `model_missing`, `rate_limited`, `engine_error`, `engine_timeout`, `invalid_json` | engine failed during a turn; for interview replies Mike moves on with the next question |
| `stt_unavailable`, `stt_failed` | speech recognition missing or failed for this answer |
| `reply_failed` | unexpected failure while replying |
| `flag_not_found`, `already_started` | invalid client action (session continues) |
| `connection_lost`, `session_failed` | the session ended; the transcript is saved |

`pong` answers `ping`: `{"type": "pong", "t": 1771234567890}`.

## Typical flows

**Interview, voice, local engine**

1. `start` -> `session_started` -> `ready` -> Mike's opening (fixed copy with the first question, no model call).
2. `activity_start` + PCM + `audio_stream_end` -> `user_transcript` -> `turn_complete` (user) -> `feedback_pending`.
3. Mike replies: a follow-up (streamed sentence by sentence, with audio) or "Okay." plus the next question (the
   code speaks it verbatim as soon as the model chooses `next_question`) -> `turn_metrics`.
4. `feedback` x3 (delivery, language, content). The user may `flag_action` or `request_stronger`.
5. After the last question Mike gives the closing line. `end_session` -> `saving` -> `session_saved` -> `debrief`.

**Gemini Live.** Same messages; Mike's voice and both transcripts come from Gemini, `speech_preview` and
`user_transcript` are not sent (user captions arrive as `transcript_delta` with `speaker: "user"`), feedback uses
the Gemini text model, and delivery metrics are text-mode (no word timings).
