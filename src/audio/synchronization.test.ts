import { describe, expect, it } from "vitest";

import { createPhaseTorusWorkletProgram } from "../patterns/phase-torus/audio/synthesis";
import {
  createWorkletOutputs,
  loadWorkletProcessor,
  sendWorkletMessage,
} from "../test-support/workletHarness";
import { renderPikoSample } from "./pikoProgram";

describe("scheduled audiovisual epoch", () => {
  it("stops computing chapter samples once a paused source has decayed to silence", () => {
    const clock = { currentFrame: 0 };
    const processor = loadWorkletProcessor(48_000, clock);
    sendWorkletMessage(processor, { type: "configure", program: createPhaseTorusWorkletProgram() });
    sendWorkletMessage(processor, { type: "start", seconds: 1, contextTime: 0 });
    processor.fade = 1;
    const output = createWorkletOutputs(128);
    processor.process([], output);
    sendWorkletMessage(processor, { type: "active", value: false });
    for (let block = 1; block <= 80; block += 1) {
      clock.currentFrame = block * 128;
      processor.process([], output);
    }
    expect(output.flat().every((channel) => channel.every((sample) => sample === 0))).toBe(true);
  });

  it("observes the actual next output sample once, after a partial-block start", () => {
    const clock = { currentFrame: 128 };
    const processor = loadWorkletProcessor(48_000, clock);
    sendWorkletMessage(processor, { type: "configure", program: createPhaseTorusWorkletProgram() });
    sendWorkletMessage(processor, { type: "start", seconds: 1, contextTime: 0.004 });
    const output = createWorkletOutputs(128);
    sendWorkletMessage(processor, { type: "observe-position", requestId: 7 });
    processor.process([], output);
    expect(processor.port.postMessage.mock.calls).toEqual([
      [
        {
          type: "position",
          requestId: 7,
          contextFrame: 256,
          positionFrame: 48_064,
          minimumPositionFrame: 48_000,
          sampleRate: 48_000,
          active: true,
        },
      ],
    ]);
    clock.currentFrame = 256;
    processor.process([], output);
    expect(processor.port.postMessage).toHaveBeenCalledTimes(1);
    sendWorkletMessage(processor, { type: "active", value: false });
    sendWorkletMessage(processor, { type: "observe-position", requestId: 8 });
    clock.currentFrame = 384;
    processor.process([], output);
    expect(processor.port.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ active: false, requestId: 8 }),
    );
  });

  it("starts on the reserved sample inside a block and keeps earlier samples silent", () => {
    const sampleRate = 48_000;
    const clock = { currentFrame: 0 };
    const processor = loadWorkletProcessor(sampleRate, clock);
    const program = createPhaseTorusWorkletProgram();
    sendWorkletMessage(processor, { type: "configure", program });
    sendWorkletMessage(processor, { type: "start", seconds: 1, contextTime: 0.004 });
    const first = createWorkletOutputs(128);
    processor.process([], first);
    expect(first.flat().every((channel) => channel.every((value) => value === 0))).toBe(true);
    clock.currentFrame = 128;
    const second = createWorkletOutputs(128);
    processor.process([], second);
    expect(second[0]![0]!.slice(0, 64).every((value) => value === 0)).toBe(true);
    for (let index = 64; index < 128; index += 1) {
      const ageSamples = index - 64;
      const reference = renderPikoSample(program, 1 + ageSamples / sampleRate, sampleRate);
      const fade = 1 - (1 - 0.0018) ** (ageSamples + 1);
      expect(second[0]![0]![index]).toBeCloseTo(reference.dryLeft * fade, 8);
      expect(second[0]![1]![index]).toBeCloseTo(reference.dryRight * fade, 8);
    }
    expect(second[0]![0]!.some((value) => Math.abs(value) > 1e-6)).toBe(true);
  });

  it("recovers the correct phase from a late start, even after an hour", () => {
    const sampleRate = 48_000;
    const clock = { currentFrame: 3_600 * sampleRate + 240 };
    const processor = loadWorkletProcessor(sampleRate, clock);
    const program = createPhaseTorusWorkletProgram();
    sendWorkletMessage(processor, { type: "configure", program });
    sendWorkletMessage(processor, { type: "start", seconds: 31.27, contextTime: 3_600 });
    processor.fade = 1;
    const output = createWorkletOutputs(128);
    processor.process([], output);
    for (let index = 0; index < 128; index += 1) {
      const reference = renderPikoSample(program, 31.275 + index / sampleRate, sampleRate);
      expect(output[0]![0]![index]).toBeCloseTo(reference.dryLeft, 7);
      expect(output[0]![1]![index]).toBeCloseTo(reference.dryRight, 7);
    }
  });

  it("cancels a pending start when paused before its epoch", () => {
    const clock = { currentFrame: 0 };
    const processor = loadWorkletProcessor(48_000, clock);
    sendWorkletMessage(processor, { type: "configure", program: createPhaseTorusWorkletProgram() });
    sendWorkletMessage(processor, { type: "start", seconds: 1, contextTime: 0.1 });
    sendWorkletMessage(processor, { type: "active", value: false });
    clock.currentFrame = 4_800;
    const output = createWorkletOutputs(128);
    processor.process([], output);
    expect(output.flat().every((channel) => channel.every((value) => value === 0))).toBe(true);
  });
});
