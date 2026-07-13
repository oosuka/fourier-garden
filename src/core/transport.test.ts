import { describe, expect, it } from "vitest";

import { Transport } from "./transport";

describe("Transport", () => {
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
