/* The user-test tracker (tools/dashboard/tracker/track.js, stage 13b) against a fake browser: the virtual screen name from
 * <html data-ut-screen> drives pageview / screen_time, a repeated value is not a second pageview, "pending" is not a screen,
 * and a click is reported by the nearest data-track. The script is plain ES5 and is run here as it ships. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import trackerSource from "../../../../tools/dashboard/tracker/track.js?raw";

interface Ev { type: string; screen: string; target?: string; ms?: number; interactive?: boolean }
type Listener = (e?: unknown) => void;

function boot(opts: { path?: string; attr?: string } = {}) {
  const attrs: Record<string, string> = opts.attr ? { "data-ut-screen": opts.attr } : {};
  const observers: Listener[] = [];
  const docEl = {
    getAttribute: (k: string) => attrs[k] ?? null,
    setAttribute: (k: string, v: string) => { attrs[k] = v; observers.forEach((f) => f()); },
    removeAttribute: (k: string) => { delete attrs[k]; observers.forEach((f) => f()); },
  };
  const winL: Record<string, Listener[]> = {};
  const docL: Record<string, Listener[]> = {};
  let tick: Listener = () => {};
  const sent: Ev[] = [];
  const location = { pathname: opts.path ?? "/", search: "" };
  const history = { pushState() {}, replaceState() {} };
  class FakeObserver { constructor(cb: Listener) { observers.push(cb); } observe() {} }
  class FakeBlob { constructor(public parts: string[]) {} }
  const store = () => { const m: Record<string, string> = {}; return { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => { m[k] = v; } }; };
  const doc = {
    documentElement: docEl,
    currentScript: { dataset: { endpoint: "http://collector/collect" } },
    addEventListener: (t: string, f: Listener) => { (docL[t] ||= []).push(f); },
  };
  const win = { addEventListener: (t: string, f: Listener) => { (winL[t] ||= []).push(f); } };
  const fetchFake = (_url: string, init: { body: string }) => {
    sent.push(...(JSON.parse(init.body) as { events: Ev[] }).events);
    return Promise.resolve();
  };
  const run = new Function(
    "document", "window", "history", "location", "sessionStorage", "localStorage", "navigator", "MutationObserver",
    "setInterval", "fetch", "Blob", trackerSource,
  );
  run(doc, win, history, location, store(), store(), { userAgent: "test" }, FakeObserver, (f: Listener) => { tick = f; return 1; }, fetchFake, FakeBlob);
  const fire = (l: Record<string, Listener[]>, t: string, e?: unknown) => (l[t] ?? []).forEach((f) => f(e));
  return {
    load: () => fire(winL, "load"),
    screen: (v: string) => docEl.setAttribute("data-ut-screen", v),
    click: (target: unknown) => fire(docL, "click", { target }),
    events: () => { tick(); return sent.filter((e) => e.type !== "session_start"); },
  };
}

/** A fake element whose nearest `[data-track]` ancestor (or itself) carries `track`. */
const el = (track: string | null, text = "") => ({
  tagName: "BUTTON",
  textContent: text,
  getAttribute: () => null,
  closest: (sel: string) => (sel === "[data-track]" ? (track ? { getAttribute: () => track } : null) : { tagName: "BUTTON", textContent: text, getAttribute: () => null }),
});

describe("user-test tracker", () => {
  // screen_time is only written for a stay longer than 0 ms, so time is faked and moved by hand.
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("without data-ut-screen the screen is the path", () => {
    const t = boot({ path: "/archive" });
    t.load();
    expect(t.events()).toEqual([expect.objectContaining({ type: "pageview", screen: "/archive" })]);
  });

  it("takes the screen name from <html data-ut-screen>, and a change is one screen_time plus one pageview", () => {
    const t = boot({ attr: "/setup/engine" });
    t.load();
    vi.advanceTimersByTime(1500);
    t.screen("/setup/check");
    const ev = t.events();
    expect(ev.map((e) => [e.type, e.screen])).toEqual([
      ["pageview", "/setup/engine"],
      ["screen_time", "/setup/engine"],
      ["pageview", "/setup/check"],
    ]);
  });

  it("the same value again is not a second pageview", () => {
    const t = boot({ attr: "/" });
    t.load();
    t.screen("/");
    t.screen("/");
    expect(t.events().filter((e) => e.type === "pageview")).toHaveLength(1);
  });

  it("\"pending\" is not a screen: no pageview and no screen_time until the app names the real one", () => {
    const t = boot({ attr: "pending" });
    t.load();
    t.screen("/server-unavailable");
    const ev = t.events();
    expect(ev.map((e) => [e.type, e.screen])).toEqual([["pageview", "/server-unavailable"]]);
  });

  it("a change before the page has loaded does not count", () => {
    const t = boot({ attr: "pending" });
    t.screen("/setup/engine");
    t.screen("/setup/check");
    t.load();
    expect(t.events().filter((e) => e.type === "pageview").map((e) => e.screen)).toEqual(["/setup/check"]);
  });

  it("a click is reported by the nearest data-track, never by the control's text", () => {
    const t = boot({ attr: "/" });
    t.load();
    t.click(el("rail-session", "Kestrel Payments · Senior PM"));
    const click = t.events().find((e) => e.type === "click");
    expect(click).toMatchObject({ screen: "/", target: "rail-session" });
  });
});
