"""Shared fixtures. Tests never touch the network, the microphone, real keys or the user's data folder."""
from __future__ import annotations

import json
from typing import AsyncIterator

import pytest

from server.engines.base import EngineStatus, LLMEngine


@pytest.fixture(autouse=True)
def isolated_data(tmp_path, monkeypatch):
    monkeypatch.setenv("IC_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("KOKORO_MODEL_DIR", str(tmp_path / "no-kokoro"))   # text-only in tests
    monkeypatch.delenv("OLLAMA_URL", raising=False)
    from server import tts
    monkeypatch.setattr(tts, "_kokoro", None)
    yield tmp_path / "data"


class FakeLLM(LLMEngine):
    """Scripted engine: picks a reply by the JSON schema (or plain text) and streams it in small pieces."""

    id = "fake"

    def __init__(self, replies: dict | None = None, single_worker: bool = False, chunk: int = 7):
        self.replies = replies or {}
        self.calls: list[dict] = []
        self._single = single_worker
        self.chunk = chunk
        self.warmed = 0

    @property
    def model(self) -> str:
        return "fake-model"

    @property
    def single_worker(self) -> bool:
        return self._single

    async def status(self) -> EngineStatus:
        return EngineStatus(code="ready", ready=True, model="fake-model")

    async def warm_up(self, messages) -> None:
        self.warmed += 1

    def _key(self, schema: dict | None) -> str:
        if schema is None:
            return "text"
        props = set(schema.get("properties", {}))
        for key, marker in (("p1", "say"), ("p2b", "items"), ("p5b", "corrections"), ("p3", "verdict"),
                            ("p2c", "rewrite"), ("suggester", "story"), ("p0", "questions")):
            if marker in props:
                return key
        if "voice" in props or "relevant" in props:
            return "p2a"
        return "unknown"

    async def chat_stream(self, messages, *, temperature=0.6, max_tokens=300, json_schema=None) -> AsyncIterator[str]:
        key = self._key(json_schema)
        self.calls.append({"key": key, "messages": messages})
        reply = self.replies.get(key, "")
        if callable(reply):
            reply = reply(messages)
        if isinstance(reply, Exception):
            raise reply
        text = reply if isinstance(reply, str) else json.dumps(reply)
        for i in range(0, len(text), self.chunk):
            yield text[i:i + self.chunk]


@pytest.fixture
def fake_llm():
    return FakeLLM
