"""Storage, settings, telemetry, documents and REST endpoints (isolated data folder)."""
from __future__ import annotations

import base64
import io
import json

import pytest
from fastapi.testclient import TestClient

from server import DATA_VERSION, config, content, documents, memory, storage, telemetry

SAME = {"Origin": "http://testserver"}
OTHER = {"Origin": "https://other.example"}


@pytest.fixture
def client():
    from server.main import create_app
    with TestClient(create_app()) as c:
        yield c


def session_record(text="exact original words"):
    return {"id": storage.new_id("s-"), "mode": "interview", "started_at": storage.now_iso(), "title": "Practice",
            "transcript": [{"role": "model", "text": "Tell me about a project?"}, {"role": "user", "text": text}],
            "feedback": [], "debrief": None}


def test_same_second_sessions_do_not_overwrite():
    a, b = session_record(), session_record()
    storage.save_session(a)
    storage.save_session(b)
    assert a["id"] != b["id"] and len(storage.list_records("sessions")) == 2
    saved = storage.read_record("sessions", a["id"])
    assert saved["data_version"] == DATA_VERSION
    md = storage.record_path("sessions", a["id"]).with_suffix(".md").read_text()
    assert "exact original words" in md and "**Mike:**" in md


def test_empty_history_has_no_fabricated_memory():
    assert memory.summary() == {"sessions_considered": 0, "weak_spots": [], "total_sessions": 0}
    assert memory.past_weak_spots_text() == "none"


def test_trash_restore_and_conflicts(client):
    record = session_record()
    storage.save_session(record)
    sid = record["id"]
    assert client.delete(f"/api/sessions/{sid}", headers=OTHER).status_code == 403
    deleted = client.delete(f"/api/sessions/{sid}", headers=SAME)
    assert deleted.status_code == 200
    assert client.get("/api/sessions").json()["sessions"] == []
    assert client.delete(f"/api/sessions/{sid}", headers=SAME).status_code == 404
    trash_id = client.get("/api/sessions/trash").json()["items"][0]["trash_id"]
    storage.save_session({**record, "transcript": []})                  # the id is taken again
    endpoint = f"/api/sessions/trash/{trash_id}/restore"
    assert client.post(endpoint, headers=SAME).status_code == 409
    storage.record_path("sessions", sid).unlink()
    assert client.post(endpoint, headers=SAME).status_code == 200
    assert client.get(f"/api/sessions/{sid}").json()["transcript"][1]["text"] == "exact original words"
    assert client.post("/api/sessions/trash/unknown-id/restore", headers=SAME).status_code == 404
    assert client.get("/api/sessions/..%2F.env").status_code == 404


def test_settings_mask_keys_and_validate(client):
    response = client.post("/api/settings", headers=SAME,
                           json={"engine": "openai_compatible",
                                 "openai_compatible": {"base_url": "http://localhost:1234/v1", "api_key": "sk-test-123",
                                                       "model": "m"}})
    assert response.status_code == 200
    assert "sk-test-123" not in response.text and response.json()["openai_compatible"]["has_api_key"] is True
    assert "sk-test-123" not in client.get("/api/settings").text
    assert config.load_settings()["openai_compatible"]["api_key"] == "sk-test-123"
    assert client.post("/api/settings", headers=SAME, json={"engine": "nope"}).status_code == 422
    assert client.post("/api/settings", headers=SAME, json={"unknown": 1}).status_code == 422
    assert client.post("/api/settings", headers=OTHER, json={"level": "B2"}).status_code == 403
    stored = json.loads((config.data_dir() / "settings.json").read_text())
    assert stored["data_version"] == DATA_VERSION


def test_telemetry_off_by_default_and_local_on_opt_in(client):
    assert client.get("/api/telemetry").json()["opt_in"] is False
    assert telemetry.record("turn", total_ms=900) is False
    assert not telemetry.path().exists()
    assert client.post("/api/telemetry", headers=SAME, json={"opt_in": True}).json()["opt_in"] is True
    assert telemetry.record("turn", total_ms=900, transcript="secret words") is True
    line = json.loads(telemetry.path().read_text().splitlines()[0])
    assert line["total_ms"] == 900 and "transcript" not in line and line["event"] == "turn"
    assert client.get("/api/telemetry").json()["remote"] is False


def test_question_bank_parses_40_questions(client):
    bank = content.question_bank()
    assert len(bank) == 40 and all(len(q.follow_ups) >= 2 for q in bank)
    assert client.get("/api/question-bank").json()["questions"][0]["id"] == "A1"


def test_documents_read_docx_and_txt():
    from docx import Document
    doc = Document()
    doc.add_paragraph("Product designer with eight years of experience in fintech and healthcare. " * 3)
    buffer = io.BytesIO()
    doc.save(buffer)
    text = documents.read_file("cv.docx", base64.b64encode(buffer.getvalue()).decode())
    assert "fintech" in text
    txt = documents.read_file("cv.txt", base64.b64encode(("Hello world. " * 20).encode()).decode())
    assert txt.startswith("Hello world.")
    with pytest.raises(documents.DocumentError):
        documents.read_file("cv.exe", base64.b64encode(b"x" * 200).decode())


def test_url_guard_rejects_bad_schemes_and_private_hosts():
    for url in ("file:///etc/passwd", "ftp://example.com/a", "http://127.0.0.1:8000/api/settings",
                "http://localhost/x", "http://192.168.1.10/jd", "http://169.254.169.254/latest/meta-data"):
        with pytest.raises(documents.DocumentError):
            documents.check_url(url)


def test_profile_and_vacancy_endpoints(client):
    assert client.put("/api/profile", headers=SAME, json={"text": "My CV text"}).json()["text"] == "My CV text"
    created = client.post("/api/vacancies", headers=SAME, json={"title": "Designer", "text": "We are hiring. " * 10})
    assert created.status_code == 200
    vid = created.json()["id"]
    assert client.get("/api/vacancies").json()["vacancies"][0]["id"] == vid
    assert client.post("/api/vacancies", headers=SAME, json={"text": "short"}).status_code == 422
    assert client.delete(f"/api/vacancies/{vid}", headers=SAME).status_code == 200


def test_known_terms():
    terms = documents.known_terms("Built dashboards in Figma and JavaScript for HubSpot. The team grew.")
    assert {"Figma", "HubSpot"} <= set(terms) and "The" not in terms


def test_session_list_names_the_first_question_and_short_sessions(client):
    record = session_record()
    record["questions"] = [{"id": "A5", "text": "Where do you want to be in two years?"}, {"id": "B1", "text": "Tell me about a conflict."}]
    record["transcript"][0].update({"kind": "question", "question_id": "A5"})
    record["debrief"] = {"verdict": "This session was too short for a full debrief.", "too_short": True}
    storage.save_session(record)
    row = client.get("/api/sessions").json()["sessions"][0]
    assert row["first_question"] == "Where do you want to be in two years?"
    assert row["too_short"] is True and row["planned"] == 2


def test_posting_title_skips_board_headers():
    from server.api import posting_title
    assert posting_title("About the job\n\nSenior Product Designer at Kestrel Pay\nWe build...") == "Senior Product Designer at Kestrel Pay"
    assert posting_title("Job description:\n") == "Job posting"
