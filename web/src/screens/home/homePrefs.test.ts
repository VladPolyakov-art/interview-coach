import { describe, expect, it } from "vitest";
import { parseStartLayout, resolveStartLayout } from "./homePrefs";

describe("start layout switch (D52)", () => {
  it("reads ?layout= in any case and ignores anything else", () => {
    expect(parseStartLayout("gemini")).toBe("gemini");
    expect(parseStartLayout(" Current ")).toBe("current");
    expect(parseStartLayout("chatgpt")).toBeNull();
    expect(parseStartLayout("")).toBeNull();
    expect(parseStartLayout(null)).toBeNull();
  });

  it("lets the URL win over the remembered choice, and defaults to current", () => {
    expect(resolveStartLayout("gemini", "current")).toBe("gemini");
    expect(resolveStartLayout(null, "gemini")).toBe("gemini");
    expect(resolveStartLayout("nonsense", "gemini")).toBe("gemini");
    expect(resolveStartLayout(null, null)).toBe("current");
    expect(resolveStartLayout(undefined, "garbage")).toBe("current");
  });
});
