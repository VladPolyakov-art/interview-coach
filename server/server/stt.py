"""Speech-to-text on this computer.

Backends, in order of preference for `auto`:
- mlx-whisper on Apple Silicon (fast, Metal);
- faster-whisper everywhere else (CTranslate2, int8 on CPU).
Both are optional imports. With neither installed the app still works with typed answers or the
browser's own recogniser (the client sends text turns).
"""
from __future__ import annotations

import importlib.util
import logging
import platform
import sys
import threading
import time
from dataclasses import dataclass, field

import numpy as np

log = logging.getLogger("uvicorn.error")
SAMPLE_RATE = 16000
MLX_DEFAULT = "mlx-community/whisper-large-v3-turbo"
LOW_CONFIDENCE = 0.5   # word probability below this is "possibly misheard" (GR9)


@dataclass
class Word:
    w: str
    start: float
    end: float
    p: float

    def public(self) -> dict:
        return {"w": self.w, "start": round(self.start, 2), "end": round(self.end, 2), "p": round(self.p, 3)}


@dataclass
class Transcript:
    text: str
    words: list[Word] = field(default_factory=list)
    duration_s: float = 0.0
    backend: str = ""

    def low_confidence(self) -> list[Word]:
        return [w for w in self.words if w.p < LOW_CONFIDENCE]


def is_apple_silicon() -> bool:
    return sys.platform == "darwin" and platform.machine() == "arm64"


def available_backends() -> list[str]:
    found = []
    if is_apple_silicon() and importlib.util.find_spec("mlx_whisper") is not None:
        found.append("mlx")
    if importlib.util.find_spec("faster_whisper") is not None:
        found.append("faster_whisper")
    return found


def choose_backend(preference: str = "auto") -> str | None:
    found = available_backends()
    if preference == "none":
        return None
    if preference in found:
        return preference
    return found[0] if found else None


def default_model(backend: str) -> str:
    if backend == "mlx":
        return MLX_DEFAULT
    try:
        import psutil
        ram = psutil.virtual_memory().total / 1024 ** 3
    except Exception:  # pragma: no cover
        ram = 8
    return "small.en" if ram >= 8 else "base.en"


class STT:
    def __init__(self, backend: str | None, model: str = ""):
        self.backend = backend
        self.model_name = model or (default_model(backend) if backend else "")
        self._lock = threading.Lock()
        self._fw_model = None

    @property
    def available(self) -> bool:
        return self.backend is not None

    def info(self) -> dict:
        return {"available": self.available, "backend": self.backend or "none", "model": self.model_name,
                "installed_backends": available_backends(), "word_confidence": self.available}

    def _faster_whisper(self):
        if self._fw_model is None:
            from faster_whisper import WhisperModel
            self._fw_model = WhisperModel(self.model_name, device="cpu", compute_type="int8")
        return self._fw_model

    def transcribe(self, pcm16k: bytes) -> Transcript:
        """16 kHz mono int16 PCM -> English transcript with per-word timestamps and probability."""
        duration = len(pcm16k) / 2 / SAMPLE_RATE
        if not self.backend or duration < 0.5:
            return Transcript(text="", duration_s=duration, backend=self.backend or "none")
        audio = np.frombuffer(pcm16k, dtype=np.int16).astype(np.float32) / 32768.0
        started = time.perf_counter()
        words: list[Word] = []
        with self._lock:   # MLX and CTranslate2 models are not shared across threads here
            if self.backend == "mlx":
                import mlx_whisper
                result = mlx_whisper.transcribe(audio, path_or_hf_repo=self.model_name, language="en",
                                                condition_on_previous_text=False, word_timestamps=True,
                                                fp16=True, verbose=None)
                text = str(result.get("text", "")).strip()
                for seg in result.get("segments", []):
                    for item in seg.get("words", []) or []:
                        words.append(Word(str(item.get("word", "")).strip(), float(item.get("start", 0)),
                                          float(item.get("end", 0)), float(item.get("probability", 1))))
            else:
                segments, _info = self._faster_whisper().transcribe(
                    audio, language="en", word_timestamps=True, beam_size=1, condition_on_previous_text=False)
                parts = []
                for seg in segments:
                    parts.append(seg.text)
                    for item in seg.words or []:
                        words.append(Word(item.word.strip(), float(item.start), float(item.end),
                                          float(item.probability)))
                text = "".join(parts).strip()
        log.info("STT %s: %.1f s of audio in %.2f s", self.backend, duration, time.perf_counter() - started)
        return Transcript(text=text, words=words, duration_s=duration, backend=self.backend)

    def transcribe_if_idle(self, pcm16k: bytes) -> Transcript | None:
        """Live captions only: skip instead of queueing behind another transcription (the final one wins)."""
        if not self._lock.acquire(blocking=False):
            return None
        self._lock.release()
        return self.transcribe(pcm16k)

    def warm_up(self) -> None:
        if self.backend:
            try:
                self.transcribe(np.zeros(SAMPLE_RATE, dtype=np.int16).tobytes())
            except Exception as exc:  # model download problems surface on first real use
                log.warning("STT warm-up failed: %s", type(exc).__name__)


_instances: dict[tuple, STT] = {}
_instances_lock = threading.Lock()


def get_stt(settings: dict) -> STT:
    block = settings.get("stt", {})
    backend = choose_backend(block.get("backend", "auto"))
    key = (backend, block.get("model", ""))
    with _instances_lock:
        if key not in _instances:
            _instances[key] = STT(backend, block.get("model", ""))
        return _instances[key]
