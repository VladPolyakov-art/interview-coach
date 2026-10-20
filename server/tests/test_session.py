"""TextDriver: interviewer turn logic on a scripted engine (no audio, no network)."""
from __future__ import annotations

import asyncio

from server import content
from server.content import Question
from server.session import TextDriver

PLAN = [Question("A1", "A", "Why this role?", {"YP": "What was your part?", "RN": "What was the result?"}),
        Question("B1", "B", "Tell me about a project you owned.", {"YP": "Your part?", "RN": "The result?"})]
LONG = "I worked on the payments team and we shipped a new checkout flow for the store last spring."


def make(llm, events, **kw):
    return TextDriver(llm, mode=kw.pop("mode", "interview"), plan=kw.pop("plan", PLAN), speak=False,
                      on_turn_complete=lambda s, t, m=None: events.append((s, t, dict(m or {}))),
                      on_metrics=lambda d: events.append(("metrics", d, {})), **kw)


async def wait_idle(driver):
    for _ in range(200):
        if not driver.replying():
            return
        await asyncio.sleep(0.01)


async def test_opening_is_fixed_and_next_question_skips_the_model(fake_llm):
    events = []
    llm = fake_llm({"p1": {"gap": "none", "action": "next_question", "say": "Okay. Tell me about a project you owned."}})
    d = make(llm, events)
    d._reply_task = asyncio.create_task(d._opening())
    await wait_idle(d)
    assert events[0][1].startswith("Hi, I'm Mike.") and "Why this role?" in events[0][1]
    assert llm.calls == []                                  # no model call for the opening
    await d.handle_user_text_turn(LONG)
    await wait_idle(d)
    model_turns = [e for e in events if e[0] == "model"]
    assert model_turns[-1][1] == "Okay. Tell me about a project you owned."
    assert model_turns[-1][2]["kind"] == "question" and d.q_index == 1
    user_meta = [e for e in events if e[0] == "user"][0][2]
    assert user_meta["question_id"] == "A1" and user_meta["answer_kind"] == "main"
    metrics = [e[1] for e in events if e[0] == "metrics"]
    assert metrics[-1]["total_ms"] is not None and metrics[-1]["path"] == "model"


async def test_follow_up_is_streamed_sanitized_and_limited(fake_llm):
    events = []
    llm = fake_llm({"p1": {"gap": "result", "action": "follow_up",
                           "say": "Great answer! What was the result of that launch?"}})
    d = make(llm, events, strictness=1)                     # strictness 1: one follow-up
    await d.handle_user_text_turn(LONG)
    await wait_idle(d)
    reply = [e for e in events if e[0] == "model"][-1]
    assert reply[1] == "Okay. What was the result of that launch?" and reply[2]["kind"] == "follow_up"
    await d.handle_user_text_turn(LONG + " It went well.")
    await wait_idle(d)
    reply = [e for e in events if e[0] == "model"][-1]
    assert reply[1] == "Okay. Tell me about a project you owned."   # follow-ups used up: code moves on
    assert len([c for c in llm.calls if c["key"] == "p1"]) == 1


async def test_short_answer_and_repeat_need_no_model(fake_llm):
    events = []
    llm = fake_llm({})
    d = make(llm, events)
    d.transcript_history.append({"role": "model", "text": "Why this role?"})
    await d.handle_user_text_turn("Not sure.")
    await wait_idle(d)
    assert [e for e in events if e[0] == "model"][-1][1] == content.copy("short_answer")
    await d.handle_user_text_turn("Sorry, can you repeat the question?")
    await wait_idle(d)
    assert [e for e in events if e[0] == "model"][-1][1].startswith("Sure.")
    assert llm.calls == []


async def test_last_question_closes_and_redo_restores_state(fake_llm):
    events = []
    llm = fake_llm({"p1": {"gap": "none", "action": "next_question", "say": "Okay."}})
    d = make(llm, events, plan=PLAN[:1])
    d.transcript_history.append({"role": "model", "text": "Why this role?"})
    await d.handle_user_text_turn(LONG)
    await wait_idle(d)
    assert d.finished and [e for e in events if e[0] == "model"][-1][2]["kind"] == "closing"
    question = await d.redo_answer()
    await wait_idle(d)
    assert question == "Why this role?" and not d.finished
    assert d.transcript_history == [{"role": "model", "text": "Why this role?"}]


async def test_engine_error_keeps_the_interview_going(fake_llm):
    from server.engines.base import EngineError
    errors, events = [], []
    llm = fake_llm({"p1": EngineError("ollama_not_running", "Ollama is not running.")})
    d = make(llm, events, on_error=lambda *a: errors.append(a))
    await d.handle_user_text_turn(LONG)
    await wait_idle(d)
    assert errors[0][0] == "ollama_not_running"
    assert [e for e in events if e[0] == "model"][-1][1] == "Okay. Tell me about a project you owned."


async def test_english_mode_streams_plain_text(fake_llm):
    events = []
    llm = fake_llm({"text": "I see. Cooking is fun. What do you like to cook? And when?"})
    d = make(llm, events, mode="english", plan=[], level="B1")
    await d.handle_user_text_turn("I like cooking at the weekend with my friends.")
    await wait_idle(d)
    assert [e for e in events if e[0] == "model"][-1][1] == "I see. Cooking is fun. What do you like to cook?"
    assert "<turn>" in llm.calls[0]["messages"][-1]["content"]


async def test_tag_prefix_is_stripped_and_repeated_follow_up_moves_on(fake_llm):
    events = []
    llm = fake_llm({"p1": {"gap": "own_part", "action": "follow_up", "say": "YP: What was your own part?"}})
    d = make(llm, events, strictness=3)                     # two follow-ups allowed
    await d.handle_user_text_turn(LONG)
    await wait_idle(d)
    assert [e for e in events if e[0] == "model"][-1][1] == "What was your own part?"
    await d.handle_user_text_turn(LONG + " We did it together.")
    await wait_idle(d)
    assert [e for e in events if e[0] == "model"][-1][1] == "Okay. Tell me about a project you owned."


def test_speech_parts_split_long_first_sentence():
    from server.session import _speech_parts
    assert _speech_parts("Okay, and what exactly did you do on that project last year?", True) == \
        ["Okay, and what exactly did you do on that project last year?"]
    assert _speech_parts("When you joined the team, what was the first thing you changed there?", True) == \
        ["When you joined the team,", "what was the first thing you changed there?"]
    assert _speech_parts("When you joined the team, what was the first thing you changed there?", False) == \
        ["When you joined the team, what was the first thing you changed there?"]
