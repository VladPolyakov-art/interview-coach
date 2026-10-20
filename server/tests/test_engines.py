"""Engine adapters with mocked HTTP: no real Ollama, OpenAI, Claude or Google calls."""
from __future__ import annotations

import json

import httpx
import pytest

from server import engines
from server.engines import claude_cli, gemini_live, ollama, openai_compat
from server.engines.base import ThinkFilter, extract_json, strip_think


def ollama_transport(models=None, chat_chunks=None, fail=False):
    def handler(request: httpx.Request) -> httpx.Response:
        if fail:
            raise httpx.ConnectError("refused", request=request)
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": n, "size": 1} for n in (models or [])]})
        if request.url.path == "/api/chat":
            body = json.loads(request.content)
            assert body["think"] is False and body["keep_alive"] == "30m"
            lines = "\n".join(json.dumps({"message": {"content": c}}) for c in (chat_chunks or ["ok"]))
            return httpx.Response(200, text=lines)
        return httpx.Response(404)
    return httpx.MockTransport(handler)


async def test_ollama_ram_default():
    assert ollama.recommended_model(8) == "qwen3:4b-instruct"
    assert ollama.recommended_model(16) == "qwen3:8b"


async def test_ollama_not_installed_and_not_running(monkeypatch):
    engine = ollama.OllamaEngine("http://127.0.0.1:1", transport=ollama_transport(fail=True), ram_gb=8)
    monkeypatch.setattr(ollama.shutil, "which", lambda name: None)
    status = await engine.status()
    assert status.code == "not_installed"
    assert "ollama.com/download" in status.hint and status.hint_command == "ollama pull qwen3:4b-instruct"
    monkeypatch.setattr(ollama.shutil, "which", lambda name: "/usr/local/bin/ollama")
    assert (await engine.status()).code == "not_running"


async def test_ollama_no_model_and_ready():
    engine = ollama.OllamaEngine("http://x", transport=ollama_transport(models=["nomic-embed-text"]), ram_gb=16)
    status = await engine.status()
    assert status.code == "no_model" and status.hint_command == "ollama pull qwen3:8b"
    engine = ollama.OllamaEngine("http://x", transport=ollama_transport(models=["qwen3:8b"]), ram_gb=16)
    status = await engine.status()
    assert status.ready and status.model == "qwen3:8b" and not status.warnings


async def test_ollama_thinking_model_warns_and_think_is_stripped():
    transport = ollama_transport(models=["qwen3:4b"], chat_chunks=["<thi", "nk>plan", "ning</think>", "Hello."])
    engine = ollama.OllamaEngine("http://x", "qwen3:4b", transport=transport)
    status = await engine.status()
    assert status.ready and status.warnings
    assert await engine.complete([{"role": "user", "content": "hi"}]) == "Hello."


def test_think_helpers():
    f = ThinkFilter()
    assert "".join(f.feed(x) for x in ["<think>", "abc", "</think> Hi", " there"]) == "Hi there"
    f = ThinkFilter()
    assert "".join(f.feed(x) for x in ["Hel", "lo"]) == "Hello"
    assert strip_think("<think>x</think>{\"a\":1}") == '{"a":1}'
    assert extract_json("```json\n{\"a\": 1}\n```") == '{"a": 1}'


def openai_transport(status=200, models=("m1",), sse=None, reject_schema=False, seen=None):
    def handler(request: httpx.Request) -> httpx.Response:
        if seen is not None:
            seen.append(request)
        if status != 200:
            return httpx.Response(status)
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json={"data": [{"id": m} for m in models]})
        body = json.loads(request.content)
        if reject_schema and body.get("response_format", {}).get("type") == "json_schema":
            return httpx.Response(400, json={"error": "response_format not supported"})
        events = sse or ["Hel", "lo"]
        text = "".join(f"data: {json.dumps({'choices': [{'delta': {'content': e}}]})}\n\n" for e in events)
        return httpx.Response(200, text=text + "data: [DONE]\n\n")
    return httpx.MockTransport(handler)


async def test_openai_compatible_stream_status_and_key_privacy():
    seen = []
    engine = openai_compat.OpenAICompatibleEngine("http://localhost:1234/v1", "sk-secret", "m1",
                                                  transport=openai_transport(seen=seen))
    assert "sk-secret" not in repr(engine)
    assert (await engine.status()).ready
    assert await engine.complete([{"role": "user", "content": "hi"}]) == "Hello"
    assert seen[0].headers["authorization"] == "Bearer sk-secret"
    assert engine.single_worker   # a local server: feedback waits for the interviewer


async def test_openai_compatible_errors():
    assert (await openai_compat.OpenAICompatibleEngine("", "", "").status()).code == "not_configured"
    bad = openai_compat.OpenAICompatibleEngine("https://api.example.com/v1", "k", "m1", transport=openai_transport(401))
    assert (await bad.status()).code == "unauthorized"
    other = openai_compat.OpenAICompatibleEngine("https://api.example.com/v1", "", "zz", transport=openai_transport())
    assert (await other.status()).code == "no_model"


async def test_openai_compatible_schema_fallback():
    engine = openai_compat.OpenAICompatibleEngine("http://localhost:1/v1", "", "m1",
                                                  transport=openai_transport(reject_schema=True, sse=['{"a": 1}']))
    assert await engine.complete_json([{"role": "user", "content": "x"}], {"type": "object"}) == {"a": 1}
    assert engine._schema_mode == "json_object"


async def test_claude_cli_not_installed_and_command(monkeypatch):
    monkeypatch.setattr(claude_cli, "find_claude", lambda: None)
    status = await claude_cli.ClaudeCLIEngine().status()
    assert status.code == "not_installed" and claude_cli.TERMS_NOTE in status.warnings
    assert claude_cli.DESCRIPTOR.terms_note == claude_cli.TERMS_NOTE
    cmd = claude_cli.build_command("claude", "haiku", "sys", True)
    assert cmd[:2] == ["claude", "-p"] and "--output-format" in cmd and "stream-json" in cmd
    assert not any(part.startswith("/Users/") for part in cmd)
    system, prompt = claude_cli.to_prompt([{"role": "system", "content": "S"}, {"role": "user", "content": "U"}])
    assert (system, prompt) == ("S", "U")


async def test_gemini_status_and_error_classification():
    assert gemini_live.basic_status("", "m").code in ("not_configured", "not_installed")
    err = gemini_live.classify_error(RuntimeError("1011 None. prepayment credits are depleted"))
    assert err.code == "billing_required"
    assert "create a key in a project without billing" in err.hint
    assert gemini_live.classify_error(RuntimeError("API key not valid")).code == "unauthorized"
    assert gemini_live.classify_error(RuntimeError("429 RESOURCE_EXHAUSTED")).code == "rate_limited"
    assert "Free tier" in gemini_live.PRIVACY_NOTE and "paid" not in gemini_live.PRIVACY_NOTE.lower()


async def test_engine_registry_lists_all_with_status(monkeypatch):
    monkeypatch.setattr(ollama.shutil, "which", lambda name: None)
    monkeypatch.setattr(claude_cli, "find_claude", lambda: None)
    settings = {"engine": "ollama", "ollama": {"url": "http://127.0.0.1:9", "model": ""},
                "openai_compatible": {"base_url": "", "api_key": "", "model": ""}, "claude_cli": {"model": "haiku"},
                "gemini_live": {"api_key": "", "model": "m", "text_model": "t", "voice": "Puck"}}
    items = await engines.all_engines(settings)
    assert [i["id"] for i in items] == ["ollama", "openai_compatible", "claude_cli", "gemini_live"]
    by_id = {i["id"]: i for i in items}
    assert by_id["ollama"]["selected"] and by_id["ollama"]["status"]["code"] == "not_installed"
    assert by_id["openai_compatible"]["status"]["code"] == "not_configured"
    assert by_id["claude_cli"]["status"]["code"] == "not_installed"


async def test_ollama_voice_session_defaults_to_small_model():
    from server import engines
    settings = {"engine": "ollama", "ollama": {"url": "http://x", "model": "qwen3:8b", "voice_model": ""}}
    assert engines.make_llm(settings, "ollama").model == "qwen3:8b"
    voice = engines.make_llm(settings, "ollama", voice=True)
    assert voice.model == "qwen3:4b-instruct"
    settings["ollama"]["voice_model"] = "qwen3:8b"
    assert engines.make_llm(settings, "ollama", voice=True).model == "qwen3:8b"


async def test_ollama_voice_default_falls_back_to_installed_large_model():
    engine = ollama.OllamaEngine("http://x", transport=ollama_transport(models=["qwen3:8b"]),
                                 default_model=ollama.VOICE_MODEL)
    status = await engine.status()
    assert status.ready and status.model == "qwen3:8b"
