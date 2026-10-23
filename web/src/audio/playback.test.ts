/* Playback.hold / resume / stop: Mike's audio is held back while the server decides whether a voice turn was speech. */
import { describe, expect, it } from "vitest";
import { OUT_RATE } from "./framing";
import { Playback } from "./playback";

/** A frame of `seconds` of audio, as the server sends it (24 kHz PCM16). */
const frame = (seconds: number) => new ArrayBuffer(Math.round(OUT_RATE * seconds) * 2);

class FakeSource {
  buffer: { duration: number } | null = null;
  onended: (() => void) | null = null;
  started: { when: number; offset: number } | null = null;
  stopped = false;
  connect() {}
  disconnect() {}
  start(when: number, offset = 0) { this.started = { when, offset }; }
  stop() { this.stopped = true; }
}

function setup() {
  const sources: FakeSource[] = [];
  const context = {
    currentTime: 0,
    state: "running",
    createBuffer: (_c: number, length: number, rate: number) => ({ duration: length / rate, copyToChannel() {} }),
    createBufferSource: () => { const s = new FakeSource(); sources.push(s); return s; },
    destination: {},
  };
  const playback = new Playback(context as unknown as AudioContext);
  return { context, playback, sources };
}

describe("Playback hold", () => {
  it("parks what has not played yet and plays it on after resume, in order", () => {
    const { context, playback, sources } = setup();
    playback.enqueue(frame(1));
    playback.enqueue(frame(1));
    expect(playback.playing).toBe(true);
    context.currentTime = 1.325;                    // the first frame (starts at 0.025) has played, the second is 0.3 s in
    playback.hold();
    expect(playback.playing).toBe(false);
    expect(sources.every((s) => s.stopped)).toBe(true);
    playback.enqueue(frame(0.5));                   // arrives while held
    expect(sources).toHaveLength(2);
    playback.resume();
    expect(sources).toHaveLength(4);
    const [, , rest, late] = sources;
    expect(rest!.started!.offset).toBeCloseTo(0.3, 2);          // the second frame goes on from where it stopped
    expect(late!.started!.offset).toBe(0);
    expect(late!.started!.when).toBeGreaterThan(rest!.started!.when);
    expect(playback.playing).toBe(true);
  });

  it("drops a frame that had already played completely", () => {
    const { context, playback, sources } = setup();
    playback.enqueue(frame(1));
    context.currentTime = 2;
    playback.hold();
    playback.resume();
    expect(sources).toHaveLength(1);
  });

  it("stop() discards everything held, also what arrives later in the same turn", () => {
    const { playback, sources } = setup();
    playback.enqueue(frame(1));
    playback.hold();
    playback.enqueue(frame(1));
    expect(playback.hasHeldAudio).toBe(true);
    playback.stop();
    playback.resume();
    expect(sources).toHaveLength(1);
    expect(playback.holding).toBe(false);
    playback.enqueue(frame(1));                     // a new Mike turn plays normally again
    expect(sources).toHaveLength(2);
    expect(playback.playing).toBe(true);
  });

  it("holding with nothing to play has no held audio and resume is harmless", () => {
    const { playback, sources } = setup();
    playback.hold();
    expect(playback.holding).toBe(true);
    expect(playback.hasHeldAudio).toBe(false);
    playback.resume();
    expect(sources).toHaveLength(0);
  });
});
