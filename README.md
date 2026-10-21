# Interview Coach

Practise job interviews out loud with **Mike**, an AI interviewer, on your own computer.
Mike asks real interview questions (general ones, or questions built from your CV and a job posting), follows up
like a real interviewer, and after each answer you get short feedback on content, English and delivery.
There is also an English conversation mode.

- Runs locally. With Ollama, nothing leaves your computer.
- Bring your own AI: Ollama, any OpenAI-compatible server (LM Studio, llama.cpp, Jan, OpenRouter, OpenAI),
  your Claude Code CLI, or Gemini Live with your own Google AI Studio key.
- Voice in: local Whisper (mlx-whisper on Apple Silicon, faster-whisper elsewhere) or your browser's recogniser.
  Voice out: Kokoro (local). Without speech models the app works with typed answers.
- Your sessions are saved as JSON and Markdown in your OS app-data folder.

License: AGPL-3.0-or-later (see `LICENSE`).

## What's free

Everything you need to practise is free forever, with no account and no key. The free core is never a demo.

| Feature | Free forever | Premium (coming later) |
|---|---|---|
| Interview practice with Mike | ✓ | ✓ |
| English practice | ✓ | ✓ |
| Prep from your CV and the job description | ✓ | ✓ |
| Question bank | ✓ | ✓ |
| Debrief after every session | ✓ | ✓ |
| Mistake memory | ✓ | ✓ |
| Weak-spot drill | ✓ | ✓ |
| Zero setup | Set up a local engine once | ✓ |
| Best live voice | Voice on this computer | ✓ |
| Trends across sessions | — | ✓ |
| History on all your devices | This computer only | ✓ |

Premium isn't available yet and has no price. When it comes, it adds to the free core and takes nothing away.

**Practice only.** This app is for rehearsal, never for help during a real interview.

<!-- Keep this table identical to Settings → About and what's free (web/src/i18n/en.json, settings.about; US-30). -->

## Quick start (development)

Requirements: Python 3.11+, and [Ollama](https://ollama.com/download) for the default local engine.

```bash
cd app/server
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cp .env.example .env            # optional: data folder, Kokoro model folder, Ollama URL

ollama pull qwen3:4b-instruct   # voice sessions use this model by default (fastest replies)
ollama pull qwen3:8b            # optional, 16 GB RAM or more: typed answers use it when installed
.venv/bin/python -m server      # http://127.0.0.1:8000  (API docs at /api/docs)
.venv/bin/python -m pytest      # tests (no network, no microphone)
```

Speech output needs the Kokoro files `kokoro-v1.0.onnx` and `voices-v1.0.bin`
(from https://github.com/thewh1teagle/kokoro-onnx/releases) in `<data folder>/models/kokoro/`,
or set `KOKORO_MODEL_DIR` to a folder that has them. `GET /api/tts` shows where the app looks.

The web app lives in `app/web` (React + Vite + TypeScript + Storybook, details in `app/web/README.md`):

```bash
cd app/web
npm install
npm run dev                     # http://localhost:5173 (proxies /api and /ws to the backend on :8000)
npm run build                   # then restart the backend: it serves app/web/dist at / (only if dist existed at start)
npm run typecheck && npm run lint && npm test
npm run storybook               # design-system components on :6006
npm run e2e                     # headless end-to-end run against :8000, screenshots in app/web/.screens/
```

First run opens a short setup: choose the AI engine (Ollama is checked live, with the exact command to fix it),
test the microphone, model and voice, optionally add your CV and the job, then start the first interview.

## Layout

```
app/
  server/
    server/            FastAPI app: engines/, session.py (Mike), feedback.py, ws.py, api.py, storage.py
    content/           prompts, JSON schemas, feedback rubric, question bank, UI copy
    tests/             pytest suite
    scripts/pii_scan.py  release check for personal data (patterns kept outside the repo)
    PROTOCOL.md        session WebSocket protocol
  web/
    src/ds/            design system (tokens, components, Storybook stories)
    src/screens/       Setup, Practice, Session, Debrief, History, Settings
    src/session/       WebSocket session state and audio wiring
    src/audio/         mic capture (AudioWorklet), playback, voice-activity detection
```

## Privacy

- Settings and API keys are stored in `settings.json` in your app-data folder (file mode 0600) and are never
  returned by the API or written to logs.
- Usage telemetry is off by default. If you opt in, events (timings, engine names, error codes, never what you
  said) are written to `telemetry.jsonl` in the same folder. Nothing is uploaded.
- Markdown export to a notes folder (for example Obsidian) is off until you choose a folder.

## Before publishing

Run the personal-data check with your own denylist (kept outside the repository). CI runs only the built-in
checks (Cyrillic text, e-mail addresses), because it has no denylist:

```bash
.venv/bin/python scripts/pii_scan.py --require-denylist   # reads ~/.config/interview-coach/denylist.txt or IC_PII_PATTERNS
```
