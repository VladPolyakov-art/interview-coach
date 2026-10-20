"""Ollama adapter: any installed model, default chosen by RAM."""
from __future__ import annotations

import json
import shutil
from typing import AsyncIterator

import httpx

from .base import EngineDescriptor, EngineError, EngineStatus, LLMEngine, Msg, ThinkFilter

DOWNLOAD_URL = "https://ollama.com/download"
# qwen3:4b on Ollama is the thinking variant: it ignores think:false. The instruct tag is the default
# for machines under 16 GB of RAM.
MODEL_SMALL = "qwen3:4b-instruct"
MODEL_LARGE = "qwen3:8b"
# Tags known to always think (they write reasoning into the reply). We still send think:false
# and strip a leading <think> block, but warn in the status.
THINKING_ONLY_TAGS = {"qwen3:4b", "qwen3:4b-thinking", "deepseek-r1", "qwq"}
NUM_CTX = 4096

DESCRIPTOR = EngineDescriptor(
    id="ollama",
    name="Ollama (local)",
    kind="text",
    local=True,
    cost="Free. Runs on this computer.",
    data_line="Your words stay on this computer: speech is recognised locally and the model runs in Ollama.",
    needs=["Ollama installed and running", "one downloaded model"],
    setup_url=DOWNLOAD_URL,
)


def total_ram_gb() -> float:
    try:
        import psutil
        return psutil.virtual_memory().total / 1024 ** 3
    except Exception:  # pragma: no cover - psutil missing
        return 8.0


def recommended_model(ram_gb: float | None = None) -> str:
    ram = total_ram_gb() if ram_gb is None else ram_gb
    return MODEL_LARGE if ram >= 15.5 else MODEL_SMALL


def is_thinking_only(model: str) -> bool:
    name = model.lower()
    return name in THINKING_ONLY_TAGS or any(name.startswith(tag + ":") for tag in THINKING_ONLY_TAGS
                                             if ":" not in tag)


def install_hint(model: str) -> str:
    return f"Install Ollama from {DOWNLOAD_URL}, start it, then run: ollama pull {model}"


class OllamaEngine(LLMEngine):
    id = "ollama"

    def __init__(self, url: str = "http://127.0.0.1:11434", model: str = "", *,
                 transport: httpx.AsyncBaseTransport | None = None, ram_gb: float | None = None):
        self.url = url.rstrip("/")
        self.requested_model = model.strip()
        self._transport = transport
        self._ram_gb = ram_gb
        self._resolved: str | None = None

    # ----- helpers -----
    def _client(self, timeout: float | httpx.Timeout = 10) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=timeout, transport=self._transport)

    @property
    def model(self) -> str:
        return self._resolved or self.requested_model or recommended_model(self._ram_gb)

    @property
    def single_worker(self) -> bool:
        return True

    async def list_models(self) -> list[dict]:
        async with self._client(5) as client:
            response = await client.get(f"{self.url}/api/tags")
            response.raise_for_status()
        models = []
        for item in response.json().get("models", []):
            details = item.get("details") or {}
            models.append({"name": item.get("name", ""), "size": item.get("size", 0),
                           "parameter_size": details.get("parameter_size", ""),
                           "family": details.get("family", ""),
                           "thinking_only": is_thinking_only(item.get("name", ""))})
        return models

    async def _resolve(self) -> tuple[str, list[str]]:
        """Pick the effective model: the user's choice, else the RAM default, else a close installed one."""
        names = [m["name"] for m in await self.list_models()]
        if self.requested_model:
            wanted = self.requested_model
            match = wanted if wanted in names else (f"{wanted}:latest" if f"{wanted}:latest" in names else "")
            return match, names
        default = recommended_model(self._ram_gb)
        for candidate in (default, MODEL_LARGE if default == MODEL_SMALL else MODEL_SMALL):
            if candidate in names and not is_thinking_only(candidate):
                return candidate, names
        usable = [n for n in names if not is_thinking_only(n) and "embed" not in n]
        return (usable[0] if usable else ""), names

    async def status(self) -> EngineStatus:
        default = self.requested_model or recommended_model(self._ram_gb)
        try:
            model, names = await self._resolve()
        except httpx.HTTPError:
            if shutil.which("ollama") is None:
                return EngineStatus(code="not_installed", message="Ollama is not installed.",
                                    hint=install_hint(default), hint_command=f"ollama pull {default}",
                                    fix_url=DOWNLOAD_URL, model=default)
            return EngineStatus(code="not_running", message="Ollama is installed but not running.",
                                hint="Open the Ollama app, or run: ollama serve", hint_command="ollama serve",
                                fix_url=DOWNLOAD_URL, model=default)
        if not model:
            return EngineStatus(code="no_model", message=f"The model {default} is not downloaded.",
                                hint=f"Run: ollama pull {default}", hint_command=f"ollama pull {default}",
                                fix_url=DOWNLOAD_URL, model=default,
                                warnings=[f"Installed models: {', '.join(names)}"] if names else [])
        self._resolved = model
        warnings = []
        if is_thinking_only(model):
            warnings.append(f"{model} is a reasoning model and may be slow or print its thinking. "
                            f"Prefer {MODEL_SMALL} or {MODEL_LARGE}.")
        return EngineStatus(code="ready", ready=True, message=f"Ollama is ready with {model}.", model=model,
                            warnings=warnings)

    async def _ensure_model(self) -> str:
        if self._resolved:
            return self._resolved
        try:
            model, _ = await self._resolve()
        except httpx.HTTPError as exc:
            raise EngineError("ollama_not_running", "Ollama is not running.",
                              "Open the Ollama app, or run: ollama serve") from exc
        if not model:
            want = self.requested_model or recommended_model(self._ram_gb)
            raise EngineError("model_missing", f"The model {want} is not downloaded.", f"Run: ollama pull {want}")
        self._resolved = model
        return model

    def _body(self, model: str, messages: list[Msg], stream: bool, temperature: float, max_tokens: int,
              json_schema: dict | None) -> dict:
        body = {"model": model, "messages": messages, "stream": stream, "think": False, "keep_alive": "30m",
                "options": {"num_ctx": NUM_CTX, "num_predict": max_tokens, "temperature": temperature}}
        if json_schema is not None:
            body["format"] = json_schema
        return body

    async def chat_stream(self, messages: list[Msg], *, temperature: float = 0.6, max_tokens: int = 300,
                          json_schema: dict | None = None) -> AsyncIterator[str]:
        model = await self._ensure_model()
        body = self._body(model, messages, True, temperature, max_tokens, json_schema)
        think = ThinkFilter()
        try:
            async with self._client(httpx.Timeout(180, connect=5)) as client:
                async with client.stream("POST", f"{self.url}/api/chat", json=body) as response:
                    if response.status_code == 404:
                        raise EngineError("model_missing", f"The model {model} is not downloaded.",
                                          f"Run: ollama pull {model}")
                    if response.status_code >= 400:
                        raise EngineError("engine_error", f"Ollama answered {response.status_code}.")
                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue
                        event = json.loads(line)
                        if event.get("error"):
                            raise EngineError("engine_error", str(event["error"])[:300])
                        delta = (event.get("message") or {}).get("content", "")
                        if delta:
                            out = think.feed(delta)
                            if out:
                                yield out
        except httpx.ConnectError as exc:
            raise EngineError("ollama_not_running", "Ollama is not running.",
                              "Open the Ollama app, or run: ollama serve") from exc

    async def warm_up(self, messages: list[Msg]) -> None:
        """Load the model and pre-read the system prompt so the first answer is fast (keep_alive 30m)."""
        try:
            model = await self._ensure_model()
            async with self._client(300) as client:
                await client.post(f"{self.url}/api/chat",
                                  json=self._body(model, messages, False, 0.6, 1, None))
        except (httpx.HTTPError, EngineError):
            pass
