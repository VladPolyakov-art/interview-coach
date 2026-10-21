"""Antigravity CLI adapter (D87): runs the user's own installed `agy` binary in print mode, signed in with Google.

The app never handles Google credentials; the user runs `agy` once and signs in themselves. Antigravity is a coding
agent and has no flag that removes its tools, so each run is fenced in: an empty temporary folder, the terminal
sandbox, no slash commands, and print mode, where every tool that needs approval (commands, files outside the folder,
the web browser, MCP) is refused. A few tools run without approval (web search, subagents), so Vukoli stops the run
at the first tool step. Antigravity keeps every run in its history; Vukoli deletes the runs it made (D87).
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import signal
import subprocess
import tempfile
import time
from pathlib import Path
from typing import AsyncIterator

from .base import EngineDescriptor, EngineError, EngineStatus, LLMEngine, Msg
from .claude_cli import child_env, to_prompt
from .locate import find_program

INSTALL_URL = "https://antigravity.google/docs/cli"
INSTALL = "curl -fsSL https://antigravity.google/cli/install.sh | bash"
TERMS_NOTE = ("Uses your own Google account via the Antigravity CLI; check Google's terms. "
              "Each request counts against your Antigravity quota.")
DESCRIPTOR = EngineDescriptor(
    id="antigravity_cli",
    name="Antigravity (your Antigravity CLI)",
    kind="text",
    local=False,
    cost="Uses your own Google AI plan or free quota.",
    data_line="Your transcribed words go to Google through your Antigravity CLI. Speech is recognised on this computer.",
    needs=["Antigravity CLI installed and signed in (run `agy` once)"],
    terms_note=TERMS_NOTE,
    setup_url=INSTALL_URL,
)
# Checked live with agy 1.4.4 (D87). The prompt goes in on stdin, so it never shows in the process list.
BASE_FLAGS = ["--input-format", "stream-json", "--output-format", "stream-json", "--sandbox",
              "--disable-slash-commands", "--effort", "low", "--print-timeout", "120s"]
LOGIN = "agy"
NO_TOOLS = "You have no tools in this conversation. Never call any tool or function; answer directly in text."
AUTH_WORDS = ("authentication", "not signed in", "sign in", "unauthenticated", "401")
_UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
_SIGN_IN_TTL = 30.0
_signed_in_cache: dict[str, tuple[float, bool]] = {}


def find_agy() -> str | None:
    return find_program("agy")


def signed_in(binary: str, fresh: bool = False) -> bool:
    """`agy models` exits 0 when signed in and 1 with "Please sign in" when not. It sends no prompt (D87).
    It asks Google for the model list, so the answer is kept for half a minute (fresh: ask again)."""
    hit = _signed_in_cache.get(binary)
    if hit and not fresh and time.monotonic() - hit[0] < _SIGN_IN_TTL:
        return hit[1]
    try:
        with tempfile.TemporaryDirectory(prefix="vukoli-agy-") as workdir:
            ok = subprocess.run([binary, "models"], cwd=workdir, env=child_env(), stdin=subprocess.DEVNULL,
                                capture_output=True, timeout=20).returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False
    _signed_in_cache[binary] = (time.monotonic(), ok)
    return ok


def remember_sign_in(ok: bool | None) -> None:
    from .. import config
    _signed_in_cache.clear()
    if config.load_settings()["antigravity_cli"].get("verified") is not ok:
        config.update_settings({"antigravity_cli": {"verified": ok}})


def history_dir() -> Path:
    return Path(child_env()["HOME"]) / ".gemini" / "antigravity-cli"


def forget(conversation_ids: set[str]) -> None:
    """Delete the conversations Vukoli's own runs left in Antigravity's history (its own ones only, by id)."""
    root = history_dir()
    for cid in conversation_ids:
        if not _UUID.match(cid):
            continue
        for suffix in (".db", ".db-wal", ".db-shm"):
            (root / "conversations" / f"{cid}{suffix}").unlink(missing_ok=True)
        shutil.rmtree(root / "brain" / cid, ignore_errors=True)


def stop(proc: asyncio.subprocess.Process) -> None:
    """Kill the run with everything it started: a child left alive would hold the output open (and keep working)."""
    try:
        os.killpg(proc.pid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
        if proc.returncode is None:
            proc.kill()


async def stop_and_wait(proc: asyncio.subprocess.Process, seconds: float = 5.0) -> None:
    """Stop the run and wait until it and its pipes are gone. A child being started at the moment of the first kill
    misses it, so the group is killed again every 0.1 s (with one kill, 18 of 40 test runs waited for that child)."""
    waiter = asyncio.ensure_future(proc.wait())
    for _ in range(int(seconds / 0.1)):
        stop(proc)
        done, _ = await asyncio.wait({waiter}, timeout=0.1)
        if done:
            return
    waiter.cancel()


async def _lines(stream: asyncio.StreamReader, gone: asyncio.Event) -> AsyncIterator[bytes]:
    """Output lines until the stream ends or `gone` is set (then nothing waits for a pipe a child may still hold)."""
    while True:
        read = asyncio.ensure_future(stream.readline())
        halt = asyncio.ensure_future(gone.wait())
        await asyncio.wait({read, halt}, return_when=asyncio.FIRST_COMPLETED)
        halt.cancel()
        if not read.done():
            read.cancel()
            return
        line = read.result()
        if not line:
            return
        yield line


def build_command(binary: str, model: str) -> list[str]:
    cmd = [binary, *BASE_FLAGS]
    return [*cmd, "--model", model] if model else cmd


def is_auth_error(message: str) -> bool:
    low = message.lower()
    return any(word in low for word in AUTH_WORDS)


class AntigravityCLIEngine(LLMEngine):
    id = "antigravity_cli"

    def __init__(self, model: str = "", binary: str | None = None, verified: bool | None = True):
        self._model = model
        self._binary = binary
        self._verified = verified

    @property
    def model(self) -> str:
        return self._model

    def _bin(self) -> str:
        binary = self._binary or find_agy()
        if not binary:
            raise EngineError("not_installed", "The Antigravity CLI is not installed.",
                              f"Install it with `{INSTALL}`, then run `agy` and sign in.")
        return binary

    async def status(self) -> EngineStatus:
        binary = self._binary or find_agy()
        if not binary:
            return EngineStatus(code="not_installed", message="The Antigravity CLI was not found on this computer.",
                                hint="Install the Antigravity CLI, then run `agy` and sign in with Google.",
                                hint_command=INSTALL, fix_url=INSTALL_URL, warnings=[TERMS_NOTE])
        if not await asyncio.to_thread(signed_in, binary):
            return EngineStatus(code="unauthorized", message="Antigravity isn't signed in.",
                                hint="Run `agy` in a new Terminal window, choose Google sign-in, then press Connect.",
                                hint_command=LOGIN, model=self._model, warnings=[TERMS_NOTE])
        # Signed in, but only a real request (Connect) proves the quota answers.
        if self._verified is not True:
            return EngineStatus(code="unverified", message="Antigravity is signed in. Connect checks that it answers.",
                                hint="Press Connect: it sends one short request on your Google account.",
                                model=self._model, warnings=[TERMS_NOTE])
        return EngineStatus(code="ready", ready=True, message="Antigravity is signed in.", model=self._model,
                            warnings=[TERMS_NOTE])

    async def chat_stream(self, messages: list[Msg], *, temperature: float = 0.6, max_tokens: int = 300,
                          json_schema: dict | None = None) -> AsyncIterator[str]:
        system, prompt = to_prompt(messages)
        if json_schema is not None:
            prompt += "\n\nReply with ONLY a JSON object matching this schema: " + json.dumps(json_schema)
        else:
            system += ("\n\nOUTPUT FORMAT: plain spoken text only. No markdown, no lists, no emojis, "
                       "no stage directions, no speaker name.")
        # Print mode has no system-prompt flag: the instructions lead the message, the turn follows.
        system = NO_TOOLS + ("\n\n" + system.strip() if system.strip() else "")
        message = {"event": "user", "message": {"content": f"{system}\n\n---\n\n{prompt}"}}
        ran: set[str] = set()
        with tempfile.TemporaryDirectory(prefix="vukoli-agy-") as workdir:
            proc = await asyncio.create_subprocess_exec(
                *build_command(self._bin(), self._model), cwd=workdir, env=child_env(),
                stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                limit=4 * 1024 * 1024, start_new_session=True)
            signed_out = asyncio.Event()

            async def watch_stderr() -> None:
                # Signed out, print mode prints a sign-in link and waits a minute for a code: stop at once.
                async for line in proc.stderr:
                    if "authentication" in line.decode(errors="replace").lower():
                        signed_out.set()
                        stop(proc)
                        return

            watcher = asyncio.create_task(watch_stderr())
            text, error, blocked = "", "", False
            try:
                proc.stdin.write((json.dumps(message) + "\n").encode())
                await proc.stdin.drain()
                proc.stdin.close()
                async for raw in _lines(proc.stdout, signed_out):
                    try:
                        event = json.loads(raw)
                    except ValueError:
                        continue
                    if event.get("conversation_id"):
                        ran.add(str(event["conversation_id"]))
                    step = event.get("step_update") or {}
                    if step.get("conversation_id"):
                        ran.add(str(step["conversation_id"]))
                    for agent in (step.get("subagent_info") or {}).get("subagents") or []:
                        ran.add(str(agent.get("conversation_id", "")))
                    if step.get("step_type") == "tool" or step.get("tool_name") or step.get("subagent_info"):
                        name = step.get("tool_name") or "subagent"
                        error, blocked = f"Antigravity tried to use a tool ({name}); Vukoli stopped it.", True
                        break
                    if event.get("event") == "result":
                        result = event.get("result") or {}
                        ran.add(str(result.get("conversation_id", "")))
                        if result.get("status") == "SUCCESS":
                            text = str(result.get("response") or "")
                        else:
                            error = str(result.get("error") or f"Antigravity CLI ended with {result.get('status')}")
                        break
                await stop_and_wait(proc)
                if signed_out.is_set():
                    error = "Antigravity isn't signed in."
                if blocked:
                    raise EngineError("engine_error", error, "Try again. If it repeats, pick another engine.")
                if not text.strip():
                    error = error or "Antigravity answered with nothing."
                    code = "unauthorized" if signed_out.is_set() or is_auth_error(error) else "engine_error"
                    if code == "unauthorized":
                        remember_sign_in(False)
                    raise EngineError(code, error[:300], f"Run `{LOGIN}` in a terminal and sign in with Google.")
                yield text.strip()
            finally:
                if proc.returncode is None:
                    await stop_and_wait(proc)
                watcher.cancel()
                forget(ran)

    async def test(self) -> EngineStatus:
        """Real round trip: costs one small request on the user's Google account."""
        try:
            reply = await asyncio.wait_for(self.complete([{"role": "user", "content": "Reply with OK."}]), 90)
        except EngineError as exc:
            return EngineStatus(code="unauthorized" if exc.code == "unauthorized" else "error",
                                message=exc.message, hint=exc.hint,
                                hint_command=LOGIN if exc.code == "unauthorized" else "", warnings=[TERMS_NOTE])
        except (asyncio.TimeoutError, OSError) as exc:
            return EngineStatus(code="error", message=f"Antigravity CLI did not answer ({type(exc).__name__}).")
        if not reply.strip():
            return EngineStatus(code="error", message="Antigravity answered with nothing.", warnings=[TERMS_NOTE])
        return EngineStatus(code="ready", ready=True, message="Antigravity answered.", model=self._model,
                            warnings=[TERMS_NOTE])
