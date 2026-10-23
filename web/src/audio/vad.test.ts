/* VadMachine: how many loud frames open a voice turn, and the stricter rule while Mike is audible or about to reply. */
import { describe, expect, it } from "vitest";
import { BASE_THRESHOLD, ECHO_START_FRAMES, ECHO_THRESHOLD, START_FRAMES, VadMachine } from "./vad";

/** Feed `count` frames of one level; the event types the machine produced, in order. */
function feedFrames(vad: VadMachine, count: number, rms: number, echoRisk: boolean): string[] {
  const types: string[] = [];
  for (let i = 0; i < count; i++) {
    vad.feed({ buffer: new ArrayBuffer(1024), rms, now: i * 32, echoRisk }).forEach((e) => types.push(e.type));
  }
  return types;
}

describe("VadMachine echo guard", () => {
  it("opens a turn after a few frames above the base threshold when Mike is quiet", () => {
    expect(feedFrames(new VadMachine(1500), START_FRAMES, BASE_THRESHOLD * 2, false)).toEqual(["start"]);
  });

  it("ignores a breath or a click under the doubled threshold while Mike's audio is (or is about to be) audible", () => {
    const breath = (BASE_THRESHOLD + ECHO_THRESHOLD) / 2;
    expect(feedFrames(new VadMachine(1500), 40, breath, true)).toEqual([]);
  });

  it("still lets loud speech through the guard, but only after more frames", () => {
    const loud = ECHO_THRESHOLD * 2;
    expect(feedFrames(new VadMachine(1500), ECHO_START_FRAMES - 1, loud, true)).toEqual([]);
    expect(feedFrames(new VadMachine(1500), ECHO_START_FRAMES, loud, true)).toEqual(["start"]);
  });
});
