import { describe, expect, it } from "vitest";

import { Transport } from "./transport";

describe("Transport", () => {
  it("holds a scheduled start until the shared audio epoch, without accumulating drift", () => {
    let now = 10;
    const transport = new Transport(() => now);
    transport.startAt(12.5, 10.05);
    expect(transport.currentTime).toBe(12.5);
    now = 10.049;
    expect(transport.currentTime).toBe(12.5);
    now = 10.1;
    expect(transport.currentTime).toBeCloseTo(12.55, 10);
    now = 3_610.05;
    expect(transport.currentTime).toBeCloseTo(3_612.5, 10);
    transport.pause();
    now = 4_000;
    expect(transport.currentTime).toBeCloseTo(3_612.5, 10);
    transport.startAt(transport.currentTime, 4_000.05);
    now = 4_001.05;
    expect(transport.currentTime).toBeCloseTo(3_613.5, 10);
  });

  it("rejects invalid positions and epochs without poisoning the current playhead", () => {
    const transport = new Transport(() => 10);
    transport.reset(4);
    expect(() => transport.startAt(-1, 10)).toThrow(/finite/);
    expect(() => transport.startAt(0, Number.NaN)).toThrow(/finite/);
    expect(transport.currentTime).toBe(4);
  });

  it("preserves position across pause and resume", () => {
    let now = 10;
    const transport = new Transport(() => now);

    transport.play();
    now = 12.5;
    expect(transport.currentTime).toBeCloseTo(2.5);

    transport.pause();
    now = 20;
    expect(transport.currentTime).toBeCloseTo(2.5);

    transport.play();
    now = 21.25;
    expect(transport.currentTime).toBeCloseTo(3.75);
  });

  it("switches to the audio clock without moving the playhead", () => {
    let performanceClock = 4;
    let audioClock = 100;
    const transport = new Transport(() => performanceClock);

    transport.play();
    performanceClock = 7;
    expect(transport.currentTime).toBe(3);

    transport.setClock(() => audioClock);
    expect(transport.currentTime).toBe(3);

    audioClock = 101;
    expect(transport.currentTime).toBe(4);
  });

  it("rebases a paused position onto the audio clock before playback", () => {
    let performanceClock = 12;
    let audioClock = 100;
    const transport = new Transport(() => performanceClock);

    transport.reset(7.5);
    transport.setClock(() => audioClock);
    transport.reset(7.5);
    transport.play();

    audioClock = 101.25;
    expect(transport.currentTime).toBeCloseTo(8.75, 12);

    performanceClock = 20;
    expect(transport.currentTime).toBeCloseTo(8.75, 12);
  });
});
