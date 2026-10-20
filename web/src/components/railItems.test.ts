import { describe, expect, it } from "vitest";
import { railSessions, railTitle, railWhen } from "./railItems";

const NOW = new Date(2026, 9, 20, 18, 0);

describe("rail chat rows (D51 item 6)", () => {
  it("drops the shared 'Interview practice · ' prefix, keeps other titles", () => {
    expect(railTitle("Interview practice · About the job", "Untitled")).toBe("About the job");
    expect(railTitle("Interview practice", "Untitled")).toBe("Interview practice");
    expect(railTitle("My Lumen rehearsal", "Untitled")).toBe("My Lumen rehearsal");
    expect(railTitle("  ", "Untitled")).toBe("Untitled");
  });

  it("shows a time today, a date otherwise, the year only for another year", () => {
    expect(railWhen(new Date(2026, 9, 20, 14, 23).toISOString(), NOW)).toBe("2:23 PM");
    expect(railWhen(new Date(2026, 9, 18, 9, 0).toISOString(), NOW)).toBe("Oct 18");
    expect(railWhen(new Date(2025, 9, 18, 9, 0).toISOString(), NOW)).toBe("Oct 18, 2025");
    expect(railWhen("nope", NOW)).toBe("");
  });

  it("sorts newest first and keeps every session", () => {
    const base = { mode: "interview" as const, duration_s: 10, engine: "ollama", answers: 1, verdict: "" };
    const rows = railSessions([
      { ...base, id: "a", title: "Interview practice", started_at: new Date(2026, 9, 19).toISOString() },
      { ...base, id: "b", title: "English practice", mode: "english", started_at: new Date(2026, 9, 20, 9).toISOString() },
      { ...base, id: "c", title: "", started_at: new Date(2026, 9, 1).toISOString() },
    ], "Untitled", NOW);
    expect(rows.map((r) => [r.id, r.title, r.track])).toEqual([["b", "English practice", "english"], ["a", "Interview practice", "interview"], ["c", "Untitled", "interview"]]);
  });
});
