"""Local storage: versioned JSON records with atomic writes, a trash folder and rendered Markdown.

Layout inside the data dir:
  meta.json                     data_version marker
  settings.json                 settings (see config.py)
  profile.json                  the user's CV / about text
  vacancies/<id>.json           job postings and cached generated questions
  sessions/<id>.json            canonical session record
  sessions/<id>.md              readable Markdown rendered from the JSON
  trash/sessions/, trash/vacancies/
  telemetry.jsonl               only when the user opted in
"""
from __future__ import annotations

import datetime
import json
import re
import secrets
import threading
from pathlib import Path
from typing import Any

from . import DATA_VERSION
from .config import data_dir

RECORD_ID = re.compile(r"[a-z0-9][a-z0-9-]{5,40}")
_lock = threading.RLock()


def now_iso() -> str:
    return datetime.datetime.now().astimezone().isoformat(timespec="seconds")


def new_id(prefix: str = "") -> str:
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    return f"{prefix}{stamp}-{secrets.token_hex(3)}"


def _check_id(record_id: str) -> str:
    if not RECORD_ID.fullmatch(record_id or ""):
        raise FileNotFoundError(record_id)
    return record_id


def _folder(kind: str) -> Path:
    path = data_dir() / kind
    path.mkdir(parents=True, exist_ok=True)
    return path


def atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + f".{secrets.token_hex(3)}.tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def write_json(path: Path, data: dict) -> dict:
    data = {"data_version": DATA_VERSION, **{k: v for k, v in data.items() if k != "data_version"}}
    atomic_write(path, json.dumps(data, ensure_ascii=False, indent=2))
    return data


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


# ---------- Generic records (sessions, vacancies) ----------

def record_path(kind: str, record_id: str) -> Path:
    return _folder(kind) / f"{_check_id(record_id)}.json"


def save_record(kind: str, record: dict) -> dict:
    with _lock:
        return write_json(record_path(kind, record["id"]), record)


def read_record(kind: str, record_id: str) -> dict:
    return read_json(record_path(kind, record_id))


def list_records(kind: str) -> list[dict]:
    items = []
    for path in _folder(kind).glob("*.json"):
        try:
            items.append(read_json(path))
        except (OSError, ValueError):
            continue
    return items


def trash_record(kind: str, record_id: str) -> dict:
    """Move a record (and its rendered Markdown) to trash. FileNotFoundError if missing."""
    source = record_path(kind, record_id)
    with _lock:
        if not source.exists():
            raise FileNotFoundError(record_id)
        trash = _folder(f"trash/{kind}")
        target = trash / source.name
        if target.exists():
            target = trash / f"{source.stem}-{secrets.token_hex(2)}.json"
        source.replace(target)
        md = source.with_suffix(".md")
        if md.exists():
            md.replace(target.with_suffix(".md"))
    return {"id": record_id, "trash_id": target.stem}


def list_trash(kind: str) -> list[dict]:
    items = []
    for path in _folder(f"trash/{kind}").glob("*.json"):
        try:
            data = read_json(path)
        except (OSError, ValueError):
            continue
        items.append({"trash_id": path.stem, "id": data.get("id", path.stem),
                      "title": data.get("title", ""), "started_at": data.get("started_at", ""),
                      "deleted_at": datetime.datetime.fromtimestamp(path.stat().st_mtime).astimezone()
                      .isoformat(timespec="seconds")})
    return sorted(items, key=lambda item: item["deleted_at"], reverse=True)


def restore_record(kind: str, trash_id: str) -> dict:
    """Restore from trash. FileNotFoundError if not in trash, FileExistsError if the id is taken again."""
    source = _folder(f"trash/{kind}") / f"{_check_id(trash_id)}.json"
    with _lock:
        if not source.exists():
            raise FileNotFoundError(trash_id)
        data = read_json(source)
        target = record_path(kind, data.get("id", trash_id))
        if target.exists():
            raise FileExistsError(target.name)
        source.replace(target)
        md = source.with_suffix(".md")
        if md.exists():
            md.replace(target.with_suffix(".md"))
    return data


# ---------- Profile ----------

def profile_path() -> Path:
    return data_dir() / "profile.json"


def read_profile() -> dict:
    path = profile_path()
    if not path.is_file():
        return {"text": "", "source": "", "updated": ""}
    try:
        return read_json(path)
    except (OSError, ValueError):
        return {"text": "", "source": "", "updated": ""}


def save_profile(text: str, source: str = "") -> dict:
    with _lock:
        return write_json(profile_path(), {"v": 1, "text": text.strip()[:40000], "source": source[:300],
                                           "updated": now_iso()})


def delete_profile() -> None:
    profile_path().unlink(missing_ok=True)


# ---------- Markdown rendering ----------

def md_cell(text: Any) -> str:
    return str(text or "").replace("|", "\\|").replace("\n", " ").strip()


def render_session_markdown(session: dict) -> str:
    started = session.get("started_at", "")
    lines = ["---", f"data_version: {DATA_VERSION}", f"id: {session.get('id', '')}",
             f"date: {started[:10]}", f"mode: {session.get('mode', '')}",
             f"engine: {session.get('engine', '')}", f"model: {session.get('model', '')}",
             "tags: [interview-practice]", "---", "",
             f"# {session.get('title') or 'Practice session'}", "",
             "Saved on this computer.", ""]
    debrief = session.get("debrief") or {}
    if debrief.get("verdict"):
        lines += ["## Debrief", "", debrief["verdict"], ""]
        for spot in debrief.get("weak_spots", []):
            lines.append(f"- **{md_cell(spot.get('layer'))}**: {md_cell(spot.get('text'))}")
        if debrief.get("strength"):
            lines += ["", f"Strength: {debrief['strength']}"]
        if debrief.get("next_step"):
            lines += ["", f"Next step: {debrief['next_step']}"]
        lines.append("")
    feedback = session.get("feedback") or []
    if feedback:
        lines += ["## Feedback per answer", ""]
        for item in feedback:
            lines.append(f"### {md_cell(item.get('question')) or 'Answer'}")
            lines.append("")
            lines.append(f"> {md_cell(item.get('answer'))}")
            lines.append("")
            layers = item.get("layers") or {}
            content = layers.get("content")
            if content:
                lines.append(f"- Content: {md_cell(content.get('fix') or 'Nothing to fix here.')}")
            delivery = layers.get("delivery")
            if delivery:
                lines.append(f"- Delivery: {md_cell(delivery.get('fix') or 'Nothing to fix here.')}")
            language = layers.get("language") or {}
            flags = [f for f in language.get("items", []) if f.get("status") in ("active", "confirmed")]
            if flags:
                lines += ["", "| Heard as | Say it like this | Why |", "| --- | --- | --- |"]
                for flag in flags:
                    lines.append(f"| {md_cell(flag.get('original'))} | {md_cell('; '.join(flag.get('better', [])))} "
                                 f"| {md_cell(flag.get('reason'))} |")
            lines.append("")
    lines += ["## Transcript", ""]
    for turn in session.get("transcript", []):
        speaker = "Mike" if turn.get("role") == "model" else "You"
        text = str(turn.get("text", "")).strip()
        if text:
            lines.append(f"**{speaker}:** {text}")
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def save_session(session: dict) -> dict:
    saved = save_record("sessions", session)
    md_path = record_path("sessions", session["id"]).with_suffix(".md")
    atomic_write(md_path, render_session_markdown(saved))
    return saved


def export_obsidian(session: dict, folder: str) -> Path | None:
    """Copy the rendered Markdown into the user's chosen folder (off until a folder is set)."""
    if not folder:
        return None
    target_dir = Path(folder).expanduser()
    if not target_dir.is_dir():
        return None
    base = f"Interview_Practice_{session.get('started_at', '')[:16].replace(':', '-').replace('T', '_')}"
    path, n = target_dir / f"{base}.md", 2
    while path.exists():
        path, n = target_dir / f"{base}-{n}.md", n + 1
    path.write_text(render_session_markdown(session), encoding="utf-8")
    return path

