"""Debrief scorecard, "what you said / how it lands" and plan (rubric section 9, US-20 AC6-AC9): built in code at read
time from the saved layers, never by the model and never saved."""
from __future__ import annotations

import copy
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from server import config, debrief_view, engines, feedback, storage

SAME = {"Origin": "http://testserver"}
ANSWER = "Last year I led the onboarding redesign and activation went up by twelve percent in two months."
SLIP_ANSWER = "I am working on this team since five years and activation went up by twelve percent."
SLIP = {"original": "since five years", "better": ["for five years"], "reason": "Use 'for' with periods of time.",
        "level": "B1", "class": "N"}
OK = {"situation": True, "task": True, "action": True, "result": True, "voice": "i", "result_type": "number",
      "relevant": True, "reflection": True, "evidence": "", "praise": ""}


def content(data: dict | None = None, *, competency: str = "B", question: str = "Tell me about a project.",
            answer: str = ANSWER) -> dict:
    h = feedback.hints(answer)
    return feedback.content_from_model({**OK, **(data or {})}, question=question, competency=competency,
                                       transcript=answer, n_i=h["n_i"], n_we=h["n_we"])


def delivery(severity: int = 0, tag: str = "", **metrics) -> dict:
    base = {"words": 100, "fillers": 0, "fillers_per_100w": 0.0, "restarts": 0, "seconds": 60.0, "wpm": 110,
            "long_pauses": 0, "mode": "voice"}
    return {"layer": "delivery", "status": "fix" if severity >= 2 else "ok", "severity": severity, "tag": tag,
            "fix": "x", "metrics": {**base, **metrics}}


def language(answer: str = ANSWER, items: list | None = None) -> dict:
    return feedback.language_layer(feedback.validate_language_items(items or [], answer, [], set()))


def record(n: int, *, kind: str = "main", competency: str = "B", question: str = "Tell me about a project.",
           data: dict | None = None, layers: dict | None = None, answer: str = ANSWER, old: bool = False) -> dict:
    base = {"content": content(data, competency=competency, question=question, answer=answer),
            "language": language(answer), "delivery": delivery()}
    base.update(layers or {})
    if old and base.get("content"):
        base["content"] = {k: v for k, v in base["content"].items() if k != "checks"}
    return {"id": f"fb-{n}", "question_id": f"q{n}", "question": question, "competency": competency,
            "answer_kind": kind, "answer": answer, "complete": True, "layers": base}


def row(card: dict, key: str) -> dict:
    return next(r for r in card["rows"] if r["key"] == key)


def model_debrief(*spots: tuple[str, str, list[str]]) -> dict:
    return {"verdict": "Clear answers.", "strength": "Structure.", "next_step": "Drill it.", "source": "model",
            "weak_spots": [{"layer": layer, "tag": tag, "text": f"fix {tag}", "evidence": evidence}
                           for layer, tag, evidence in spots]}


# ---------- saving the raw checks ----------

def test_content_layer_keeps_the_raw_checks_with_the_corrected_voice():
    fix = content({"voice": "i", "result": False, "result_type": "none"}, answer="We did the work as a team.")
    ok = content()
    for layer in (fix, ok):
        assert set(layer["checks"]) == {"situation", "task", "action", "result", "voice", "result_type", "relevant",
                                        "reflection", "invites_reflection", "hypothetical"}
    assert fix["checks"]["voice"] == "we"                       # "i" corrected by the counters (n_i == 0, n_we > 0)
    assert ok["checks"] == {"situation": True, "task": True, "action": True, "result": True, "voice": "i",
                            "result_type": "number", "relevant": True, "reflection": True,
                            "invites_reflection": False, "hypothetical": False}
    assert content(competency="F")["checks"]["invites_reflection"] is True
    assert content(question="What would you do differently?")["checks"]["invites_reflection"] is True
    assert content(competency="H")["checks"]["hypothetical"] is True


# ---------- scoring ----------

def test_a_perfect_session_scores_five_everywhere_and_asks_for_no_lesson():
    card = debrief_view.build_scorecard([record(1), record(2), record(3)])
    assert [r["key"] for r in card["rows"]] == list(debrief_view.ROWS)
    scores = {r["key"]: r["score"] for r in card["rows"]}
    assert scores == {"structure": 5, "own_part": 5, "result": 5, "relevance": 5, "reflection": None,
                      "language": 5, "delivery": 5}
    assert all(r["lost"] == [] for r in card["rows"])
    assert row(card, "reflection") == {"key": "reflection", "score": None, "answers": 0, "lost": []}   # Not asked


def test_rounding_is_half_up_not_bankers():
    assert [debrief_view.round_score(p, 4) for p in range(9)] == [1, 2, 2, 3, 3, 4, 4, 5, 5]
    assert debrief_view.round_score(3, 4) == 3       # 2.5 -> 3 (round() gives 2)
    assert debrief_view.round_score(1, 4) == 2       # 1.5 -> 2
    assert debrief_view.round_score(1, 1) == 3 and debrief_view.round_score(0, 3) == 1
    assert debrief_view.round_score(2, 1) == 5


def test_structure_result_and_lost_questions():
    records = [record(1), record(2, data={"result": False, "result_type": "none"}),
               record(3, data={"result_type": "vague"}), record(4, data={"action": False})]
    card = debrief_view.build_scorecard(records)
    # structure: 2 + 0 + 2 + 0 = 4 of 8 -> 3;  result: 2 + 0 + 1 + 2 = 5 of 8 -> 1 + 4*5/8 = 3.5 -> 4
    assert (row(card, "structure")["score"], row(card, "structure")["lost"]) == (3, ["q2", "q4"])
    assert (row(card, "result")["score"], row(card, "result")["lost"]) == (4, ["q2", "q3"])


def test_situation_missing_costs_one_point_only_with_checks():
    new = debrief_view.build_scorecard([record(1, data={"situation": False})])
    old = debrief_view.build_scorecard([record(1, data={"situation": False}, old=True)])
    assert (row(new, "structure")["score"], row(new, "structure")["lost"]) == (3, ["q1"])   # 1 of 2 points
    assert (row(old, "structure")["score"], row(old, "structure")["lost"]) == (5, [])        # cannot be known


def test_own_part_we_mixed_we_s2_and_we_s3():
    text_i = "We shipped it and I wrote the migration and tested it."
    records = [record(1), record(2, data={"voice": "mixed"}),
               record(3, data={"voice": "we"}, answer="We shipped it, then I fixed the test."),
               record(4, data={"voice": "we"}, answer="We shipped it as a team and we measured it."),
               record(5, answer=text_i)]
    card = debrief_view.build_scorecard(records)
    # 2 + 1 + 1 + 0 + 2 = 6 of 10 -> 3.4 -> 3
    assert (row(card, "own_part")["score"], row(card, "own_part")["lost"]) == (3, ["q2", "q3", "q4"])


def test_hypothetical_answers_are_skipped_on_the_story_rows_but_not_on_the_question():
    h = record(1, competency="H", data={"action": False, "result": False, "result_type": "none", "relevant": False})
    card = debrief_view.build_scorecard([h, record(2)])
    for key in ("structure", "own_part", "result"):
        assert row(card, key)["answers"] == 1 and row(card, key)["score"] == 5
    assert (row(card, "relevance")["answers"], row(card, "relevance")["score"], row(card, "relevance")["lost"]) == \
        (2, 3, ["q1"])


def test_reflection_applies_only_to_questions_that_invite_it():
    records = [record(1, competency="F", data={"reflection": False}), record(2, data={"reflection": False}),
               record(3, question="What would you do differently?", data={"reflection": True})]
    card = debrief_view.build_scorecard(records)
    assert (row(card, "reflection")["answers"], row(card, "reflection")["score"],
            row(card, "reflection")["lost"]) == (2, 3, ["q1"])


def test_follow_up_answers_count_only_on_language_and_delivery():
    follow = record(2, kind="follow_up", data={"result": False, "result_type": "none"},
                    layers={"delivery": delivery(3, "pace_fast", wpm=200)})
    card = debrief_view.build_scorecard([record(1), follow])
    assert row(card, "result")["answers"] == 1 and row(card, "result")["score"] == 5
    assert (row(card, "delivery")["answers"], row(card, "delivery")["score"], row(card, "delivery")["lost"]) == \
        (2, 3, ["q2"])
    assert row(card, "language")["answers"] == 2


def test_old_records_without_checks_use_the_tags():
    old = [record(1, old=True, data={"result": False, "result_type": "none"}),
           record(2, old=True, data={"result_type": "vague"}), record(3, old=True, data={"voice": "mixed"}),
           record(4, old=True, data={"reflection": False}, competency="F", question="Tell me about a failure."),
           record(5, old=True, data={"voice": "mixed"})]
    assert all("checks" not in r["layers"]["content"] for r in old)
    card = debrief_view.build_scorecard(old)
    assert row(card, "result")["lost"] == ["q1", "q2"]
    assert row(card, "own_part")["lost"] == ["q3", "q5"]
    assert row(card, "reflection")["lost"] == ["q4"]
    assert row(card, "structure")["lost"] == ["q1"]


def test_language_points_follow_the_counted_severity_and_ignore_dismissed_and_misheard():
    def lang(item_class: str = "N", status: str = "active") -> dict:
        layer = language(SLIP_ANSWER, [{**SLIP, "class": item_class}])
        layer["items"][0]["status"] = status
        return feedback.language_layer(layer["items"])
    records = [record(1, answer=SLIP_ANSWER, layers={"language": lang("M")}),            # S3 -> 0
               record(2, answer=SLIP_ANSWER, layers={"language": lang("N")}),            # S2 -> 1
               record(3, answer=SLIP_ANSWER, layers={"language": lang("C")}),            # S1 -> 2
               record(4, answer=SLIP_ANSWER, layers={"language": lang("M", "dismissed")}),
               record(5, answer=SLIP_ANSWER, layers={"language": lang("M", "unconfirmed")})]
    card = debrief_view.build_scorecard(records)
    assert (row(card, "language")["answers"], row(card, "language")["lost"]) == (5, ["q1", "q2"])
    assert row(card, "language")["score"] == 4          # (0+1+2+2+2) = 7 of 10 -> 1 + 2.8 = 3.8 -> 4
    confirmed = lang("M", "confirmed")
    assert row(debrief_view.build_scorecard([record(1, answer=SLIP_ANSWER, layers={"language": confirmed})]),
               "language")["lost"] == ["q1"]


def test_typed_answers_count_in_delivery_and_unavailable_layers_are_skipped():
    text = delivery(3, "too_short", mode="text", wpm=None, seconds=None)
    unavailable = {"layer": "language", "status": "unavailable", "code": "timeout"}
    card = debrief_view.build_scorecard([record(1, layers={"delivery": text, "language": unavailable})])
    assert (row(card, "delivery")["score"], row(card, "delivery")["answers"], row(card, "delivery")["lost"]) == \
        (1, 1, ["q1"])
    assert (row(card, "language")["score"], row(card, "language")["answers"]) == (None, 0)


def test_enriched_weak_spot_evidence_has_no_duplicate_question_ids():
    debrief = model_debrief(("content", "no_result", ["q1", "q1", "q2", "q1"]))
    out = debrief_view.enrich_debrief(debrief, spot_records(), "interview")
    assert out["weak_spots"][0]["evidence"] == ["q1", "q2"]


def test_a_dismissed_content_layer_takes_no_points():
    r = record(1, data={"result": False, "result_type": "none"})
    r["layers"]["content"]["dismissed"] = True
    card = debrief_view.build_scorecard([r])
    assert row(card, "result")["score"] == 5 and row(card, "structure")["score"] == 5


def test_q_ids_follow_the_debrief_numbering_which_skips_records_without_layers():
    empty = {"id": "fb-0", "answer_kind": "main", "answer": "x", "layers": {}}
    card = debrief_view.build_scorecard([empty, record(1, data={"result": False, "result_type": "none"})])
    assert row(card, "result")["lost"] == ["q1"]


# ---------- weak spots ----------

def spot_records() -> list[dict]:
    layer = language(SLIP_ANSWER, [SLIP])
    return [record(1, data={"result": False, "result_type": "none", "evidence": "went up by twelve percent"},
                   layers={"delivery": delivery(3, "pace_fast", wpm=182, seconds=160.0)}),
            record(2, answer=SLIP_ANSWER, layers={"language": layer, "delivery": delivery(
                2, "filler_high", fillers_per_100w=9.0)}),
            record(3, layers={"delivery": delivery(3, "long_pauses", long_pauses=3)})]


def test_weak_spots_get_a_verified_quote_or_a_metric_and_how_it_lands():
    records = spot_records()
    tag = records[1]["layers"]["language"]["items"][0]["tag"]
    debrief = model_debrief(("content", "no_result", ["q1"]), ("language", tag, ["q2"]),
                            ("delivery", "pace_fast", ["q1"]), ("delivery", "filler_high", ["q2"]))
    out = debrief_view.enrich_debrief(debrief, records, "interview")
    content_spot, language_spot, pace, filler = out["weak_spots"]
    assert (content_spot["said"], content_spot["said_kind"], content_spot["said_from"]) == \
        ("went up by twelve percent", "quote", "q1")
    assert content_spot["lands_as"] == debrief_view.LANDS_AS["no_result"]
    assert (language_spot["said"], language_spot["said_kind"]) == ("since five years", "quote")
    assert language_spot["lands_as"] == debrief_view.LANDS_AS[tag]
    assert (pace["said"], pace["said_kind"]) == ("182 words per minute", "metric")
    assert (filler["said"], filler["said_kind"]) == ("9 fillers per 100 words", "metric")
    assert debrief["weak_spots"][0].keys() == {"layer", "tag", "text", "evidence"}      # the input is not touched


def test_metric_phrases():
    phrase = debrief_view._metric_phrase
    assert phrase("too_long", {"mode": "voice", "seconds": 160.0}) == "2 min 40 s"
    assert phrase("too_short", {"mode": "voice", "seconds": 18.4}) == "18 s"
    assert phrase("too_long", {"mode": "text", "words": 600}) == "600 words"
    assert phrase("long_pauses", {"long_pauses": 3}) == "3 long pauses"
    assert phrase("filler_high", {"fillers_per_100w": 4.5}) == "4.5 fillers per 100 words"
    assert phrase("pace_slow", {"wpm": 70}) == "70 words per minute"
    assert phrase("restarts", {"restarts": 4}) == "4 repeated words"
    assert phrase("pace_fast", {}) == "" and phrase("long_pauses", {"long_pauses": 0}) == ""


def test_a_quote_that_is_not_in_the_answer_is_never_shown():
    records = spot_records()
    records[0]["layers"]["content"]["evidence"] = "something the user never said"
    records[1]["layers"]["language"]["items"][0]["original"] = "since six years"
    tag = records[1]["layers"]["language"]["items"][0]["tag"]
    debrief = model_debrief(("content", "no_result", ["q1"]), ("language", tag, ["q2"]))
    out = debrief_view.enrich_debrief(debrief, records, "interview")
    assert all("said" not in s and "said_kind" not in s for s in out["weak_spots"])
    assert out["weak_spots"][0]["lands_as"]                                 # the table line is still there


def test_said_comes_from_the_first_question_of_the_evidence_that_has_one():
    records = spot_records()
    records[2]["layers"]["content"] = content({"result": False, "result_type": "none",
                                                "evidence": "led the onboarding redesign"})
    debrief = model_debrief(("content", "no_result", ["q1", "q3"]))
    records[0]["layers"]["content"]["evidence"] = ""
    out = debrief_view.enrich_debrief(debrief, records, "interview")
    assert (out["weak_spots"][0]["said"], out["weak_spots"][0]["said_from"]) == ("led the onboarding redesign", "q3")


def test_a_dismissed_language_item_changes_what_you_said_and_the_plan():
    records = spot_records()
    tag = records[1]["layers"]["language"]["items"][0]["tag"]
    debrief = model_debrief(("language", tag, ["q2"]), ("delivery", "filler_high", ["q2"]))
    before = debrief_view.enrich_debrief(debrief, records, "interview")
    assert before["weak_spots"][0]["said"] == "since five years" and before["plan"][0]["drill"] is True
    feedback.apply_flag_action(records[1], records[1]["layers"]["language"]["items"][0]["id"], "dismiss")
    after = debrief_view.enrich_debrief(feedback.refresh_weak_spots(debrief, records, "content-first"),
                                        records, "interview")
    assert [s["tag"] for s in after["weak_spots"]] == ["no_result", "filler_high"]    # the language spot is gone
    assert [(s["tag"], s["text"], s["drill"]) for s in after["plan"]] == [
        ("no_result", debrief_view.PLAN_STEPS["no_result"], True), ("filler_high", debrief_view.HABIT_PLAN, False)]
    assert [s["tag"] for s in before["plan"]] == [tag, "filler_high"]
    assert row(after["scorecard"], "language")["lost"] == []                   # dismissed: no points lost
    assert row(before["scorecard"], "language")["lost"] == ["q2"]
    stale = debrief_view.enrich_debrief(debrief, records, "interview")        # a stale spot gets no quote
    assert "said" not in stale["weak_spots"][0]


def test_unknown_tag_has_no_how_it_lands_and_no_plan_step():
    debrief = model_debrief(("content", "mystery", ["q1"]), ("content", "no_result", ["q1"]))
    out = debrief_view.enrich_debrief(debrief, spot_records(), "interview")
    assert "lands_as" not in out["weak_spots"][0] and "lands_as" in out["weak_spots"][1]
    assert [(s["tag"], s["drill"]) for s in out["plan"]] == [("no_result", True)]


def test_plan_has_one_step_per_spot_up_to_three_and_the_drill_on_the_first():
    debrief = model_debrief(("content", "we_not_i", []), ("delivery", "too_long", []), ("language", "tense", []),
                            ("content", "no_reflection", []))
    out = debrief_view.enrich_debrief(debrief, spot_records(), "interview")
    assert [(s["tag"], s["drill"]) for s in out["plan"]] == [("we_not_i", True), ("too_long", False),
                                                              ("tense", False)]
    assert out["plan"][0]["text"] == "For each story, name the one decision that was yours."
    assert out["plan"][1]["text"] == "Time one answer: aim for one to two minutes."
    assert out["plan"][2]["text"] == debrief_view.LANGUAGE_PLAN
    assert debrief_view.enrich_debrief(model_debrief(), spot_records(), "interview")["plan"] == []


def test_tables_match_the_rubric_text():
    rubric = (Path(feedback.__file__).parent.parent / "content" / "feedback_rubric.md").read_text(encoding="utf-8")
    for text in list(debrief_view.LANDS_AS.values()) + list(debrief_view.PLAN_STEPS.values()):
        assert text in rubric, text


# ---------- modes that stay as they were ----------

def test_english_mode_and_too_short_and_missing_debrief_are_untouched():
    debrief = model_debrief(("content", "no_result", ["q1"]))
    assert debrief_view.enrich_debrief(debrief, spot_records(), "english") is debrief
    short = {**debrief, "too_short": True}
    assert debrief_view.enrich_debrief(short, spot_records(), "interview") is short
    assert debrief_view.enrich_debrief(None, [], "interview") is None


def test_enrich_does_not_change_the_saved_debrief_and_strip_removes_what_it_adds():
    debrief = model_debrief(("content", "no_result", ["q1"]))
    before = copy.deepcopy(debrief)
    out = debrief_view.enrich_debrief(debrief, spot_records(), "interview")
    assert debrief == before and "scorecard" in out and "plan" in out
    assert debrief_view.strip_enriched(out) == before
    assert debrief_view.strip_enriched(before) is before


# ---------- Markdown ----------

def session_with(records: list[dict], debrief: dict, **over) -> dict:
    return {"id": storage.new_id("s-"), "mode": "interview", "started_at": storage.now_iso(), "title": "Practice",
            "engine": config.load_settings()["engine"], "level": "B1", "questions": [], "transcript": [],
            "feedback": records, "debrief": debrief, **over}


def test_markdown_export_has_scorecard_weak_spot_lines_and_plan():
    records = spot_records()
    debrief = model_debrief(("content", "no_result", ["q1"]), ("delivery", "pace_fast", ["q1"]))
    text = storage.render_session_markdown(session_with(records, debrief))
    assert "### Scorecard" in text and "| Criterion | Score |" in text
    assert "| Structure (STAR) | 4/5 |" in text and "| Lessons learned | Not asked this time |" in text
    assert "  - What you said: \"went up by twelve percent\"" in text
    assert f"  - How it lands: {debrief_view.LANDS_AS['no_result']}" in text
    assert "  - How to fix: fix no_result" in text
    assert "  - What you said: 182 words per minute" in text
    assert "### Plan for the next session" in text
    assert f"1. {debrief_view.PLAN_STEPS['no_result']}" in text and f"2. {debrief_view.HABIT_PLAN}" in text


def test_markdown_for_english_mode_keeps_the_old_format():
    text = storage.render_session_markdown(session_with(
        spot_records(), model_debrief(("delivery", "pace_fast", ["q1"])), mode="english"))
    assert "- **delivery**: fix pace_fast" in text and "Scorecard" not in text and "Plan for" not in text


def test_saving_never_writes_the_enriched_fields():
    records = spot_records()
    shown = debrief_view.enrich_debrief(model_debrief(("content", "no_result", ["q1"])), records, "interview")
    session = session_with(records, shown)
    storage.save_session(session)
    saved = storage.read_record("sessions", session["id"])["debrief"]
    assert "scorecard" not in saved and "plan" not in saved and "said" not in saved["weak_spots"][0]
    assert "Scorecard" in (storage.record_path("sessions", session["id"]).with_suffix(".md")).read_text()


# ---------- API ----------

@pytest.fixture
def client():
    from server.main import create_app
    with TestClient(create_app()) as c:
        yield c


def saved(records: list[dict], debrief: dict, **over) -> str:
    session = session_with(records, debrief, **over)
    storage.save_session(session)
    return session["id"]


def check_shown(debrief: dict) -> None:
    assert [r["key"] for r in debrief["scorecard"]["rows"]] == list(debrief_view.ROWS)
    assert isinstance(debrief["plan"], list)
    assert debrief["weak_spots"][0]["lands_as"] and debrief["verdict"]


def test_get_session_flag_and_rerun_return_the_enriched_debrief_and_the_file_stays_clean(client, monkeypatch, fake_llm):
    records = spot_records()
    tag = records[1]["layers"]["language"]["items"][0]["tag"]
    sid = saved(records, model_debrief(("content", "no_result", ["q1"]), ("language", tag, ["q2"])))
    shown = client.get(f"/api/sessions/{sid}").json()["debrief"]
    check_shown(shown)
    assert shown["weak_spots"][0]["said"] == "went up by twelve percent"

    flag_id = records[1]["layers"]["language"]["items"][0]["id"]
    reply = client.post(f"/api/sessions/{sid}/flags/{flag_id}", headers=SAME,
                        json={"feedback_id": "fb-2", "action": "dismiss"})
    assert reply.status_code == 200, reply.text
    after = reply.json()["debrief"]
    check_shown(after)
    assert [s["tag"] for s in after["weak_spots"]] == ["no_result", "pace_fast"]      # the language spot is gone
    assert [s["tag"] for s in after["plan"]] == ["no_result", "pace_fast"]

    llm = fake_llm({"p3": {"verdict": "Clear answers.", "strength": "Structure.", "next_step": "Drill it.",
                           "weak_spots": [{"layer": "content", "tag": "no_result", "text": "x", "evidence": ["q1"]}]}})
    monkeypatch.setattr(engines, "make_llm", lambda *a, **k: llm)
    rerun = client.post(f"/api/sessions/{sid}/debrief", headers=SAME)
    assert rerun.status_code == 200, rerun.text
    check_shown(rerun.json())
    assert rerun.json()["plan"][0]["drill"] is True

    on_disk = storage.read_record("sessions", sid)["debrief"]
    assert not {"scorecard", "plan"} & on_disk.keys()
    assert not any({"said", "said_kind", "said_from", "lands_as"} & s.keys() for s in on_disk["weak_spots"])
    assert "### Scorecard" in client.get(f"/api/sessions/{sid}/markdown").text


def test_recheck_returns_the_enriched_debrief(client, monkeypatch, fake_llm):
    records = spot_records()
    sid = saved(records, model_debrief(("content", "no_result", ["q1"])))
    llm = fake_llm({"p2b": {"items": []}, "p2a": {**OK, "result": False, "result_type": "none",
                                                   "evidence": "activation went up"}})
    monkeypatch.setattr(engines, "make_llm", lambda *a, **k: llm)
    reply = client.post(f"/api/sessions/{sid}/recheck", headers=SAME,
                        json={"feedback_id": "fb-1", "text": "Last year I led the onboarding redesign and "
                                                             "activation went up a lot after it."})
    assert reply.status_code == 200, reply.text
    shown = reply.json()["debrief"]
    check_shown(shown)
    assert shown["weak_spots"][0]["said"] == "activation went up"
    assert row(shown["scorecard"], "result")["lost"] == ["q1"]
    assert "scorecard" not in storage.read_record("sessions", sid)["debrief"]


def test_english_and_too_short_sessions_over_the_api_are_unchanged(client):
    english = saved(spot_records(), model_debrief(("delivery", "pace_fast", ["q1"])), mode="english")
    short = saved(spot_records(), {**model_debrief(), "too_short": True})
    assert "scorecard" not in client.get(f"/api/sessions/{english}").json()["debrief"]
    assert "scorecard" not in client.get(f"/api/sessions/{short}").json()["debrief"]
    assert client.get(f"/api/sessions/{saved([], None)}").json()["debrief"] is None


def test_old_session_without_checks_gets_the_new_fields_without_a_model_call(client):
    old = [record(i, old=True) for i in (1, 2, 3)]
    old[0]["layers"]["content"] = {k: v for k, v in content({"result": False, "result_type": "none"}).items()
                                   if k != "checks"}
    sid = saved(old, model_debrief(("content", "no_result", ["q1"])))
    shown = client.get(f"/api/sessions/{sid}").json()["debrief"]
    assert row(shown["scorecard"], "result")["lost"] == ["q1"]
    assert shown["plan"][0]["text"] == debrief_view.PLAN_STEPS["no_result"]


def test_old_template_language_text_is_replaced_by_the_real_fix():
    from server.debrief_view import _enrich_spot
    from server.feedback import LANGUAGE_FIX
    out = _enrich_spot({"layer": "language", "tag": "article", "text": "Work on article.", "evidence": []}, [])
    assert out["text"] == LANGUAGE_FIX["article"]
    kept = _enrich_spot({"layer": "language", "tag": "article", "text": "Say 'the' before specific nouns.", "evidence": []}, [])
    assert kept["text"] == "Say 'the' before specific nouns."
