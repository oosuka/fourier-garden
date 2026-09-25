import { describe, expect, it } from "vitest";
import {
  createPikoEvents,
  getPikoEnvelope,
  getPikoPan,
  renderPikoSample,
  type PikoWorkletProgram,
} from "./pikoProgram";
import {
  createWorkletOutputs,
  loadWorkletProcessor,
  sendWorkletMessage,
} from "../test-support/workletHarness";

function fixture(): PikoWorkletProgram {
  return {
    kind: "lissajous-orchard",
    score: {
      cycleSeconds: 1,
      events: createPikoEvents({
        cycleSeconds: 1,
        count: 1,
        time: () => 0,
        frequency: () => 600,
        mathematicalGain: () => 1,
        gain: () => 0.4,
        pan: () => 0,
        wet: () => 0.1,
        articulation: () => ({ attackSeconds: 0.01, decaySeconds: 0.1, endSeconds: 0.3 }),
      }),
    },
    detuneRatio: 0,
    outputGain: 1,
    maximumVoices: 4,
    timbre: { partialRatio: 1.5, partialGain: 0.12, chirpRatio: 0 },
  };
}

describe("material excitation and phase transport", () => {
  it("follows a nested absolute phase instead of freezing the Lissajous coordinate", () => {
    const event = {
      ...fixture().score.events[0]!,
      pan: -0.08,
      panMotionDepth: 0.72,
      panMotionPhaseRadians: 1.7,
      panPhaseModulationDepth: Math.PI / 3,
      panPhaseModulationRate: 0.025,
    };
    for (const time of [0, 59.99, 60.01, 3_600.25]) {
      const expected = -0.08 + 0.72 * Math.sin(1.7 + (Math.PI / 3) * Math.sin(time * 0.025));
      expect(getPikoPan(event, time)).toBeCloseTo(expected, 12);
    }
  });

  it.each([
    { chirpRatio: 0.04, phaseDrift: 0 },
    { chirpRatio: 0, phaseDrift: 30 * Math.PI * 2 },
  ])(
    "excludes a carrier crossing 0.45 Fs through $chirpRatio chirp or $phaseDrift phase drift",
    ({ chirpRatio, phaseDrift }) => {
      const base = fixture();
      const program = {
        ...base,
        timbre: { ...base.timbre, chirpRatio },
        score: {
          ...base.score,
          events: [{ ...base.score.events[0]!, frequencyHz: 880, phaseDrift }],
        },
      };
      expect(renderPikoSample(program, 0.037, 2_000)).toEqual({
        dryLeft: 0,
        dryRight: 0,
        wetLeft: 0,
        wetRight: 0,
      });
      const processor = loadWorkletProcessor(2_000);
      sendWorkletMessage(processor, { type: "configure", program });
      expect(processor.port.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" }),
      );
    },
  );

  it("drops only the secondary partial when its additive phase drift crosses the band", () => {
    const base = fixture();
    const program = {
      ...base,
      timbre: { ...base.timbre, partialRatio: 1.49 },
      score: {
        ...base.score,
        events: [{ ...base.score.events[0]!, phaseDrift: 10 * Math.PI * 2 }],
      },
    };
    const fundamentalOnly = { ...program, timbre: { ...program.timbre, partialGain: 0 } };
    expect(renderPikoSample(program, 0.037, 2_000)).toEqual(
      renderPikoSample(fundamentalOnly, 0.037, 2_000),
    );
  });

  it("lets coefficient-weighted contact decay into the rounded carrier", () => {
    const base = fixture();
    const program = { ...base, timbre: { ...base.timbre, partialDecayScale: 0.4 } };
    for (const mathematicalGain of [1, 0.04]) {
      const event = { ...base.score.events[0]!, mathematicalGain };
      const varied = { ...program, score: { ...program.score, events: [event] } };
      for (const time of [0.021, 0.079, 0.19]) {
        const initialPartial = 0.12 * (0.35 + 0.65 * Math.sqrt(mathematicalGain));
        const partial = initialPartial * Math.exp(-time / (0.1 * 0.4));
        const carrierPhase = 2 * Math.PI * 600 * time;
        const wave =
          (Math.sin(carrierPhase) + partial * Math.sin(carrierPhase * 1.5)) /
          Math.sqrt(1 + initialPartial ** 2);
        const expected = wave * getPikoEnvelope(event, time) * 0.4 * Math.SQRT1_2 * 0.9;
        expect(renderPikoSample(varied, time, 48_000).dryLeft).toBeCloseTo(expected, 12);
      }
    }
  });

  it("matches the worklet across repeated blocks after an hour with phase modulation and contact decay", () => {
    const base = fixture();
    const program = {
      ...base,
      timbre: { ...base.timbre, partialDecayScale: 0.4, chirpRatio: 0.018 },
      score: {
        ...base.score,
        events: [
          {
            ...base.score.events[0]!,
            mathematicalGain: 0.04,
            phaseDrift: 0.45,
            panMotionDepth: 0.72,
            panMotionPhaseRadians: 1.7,
            panPhaseModulationDepth: Math.PI / 3,
            panPhaseModulationRate: 0.025,
          },
        ],
      },
    };
    const sampleRate = 48_000;
    const start = 3_600.03125;
    const processor = loadWorkletProcessor(sampleRate);
    sendWorkletMessage(processor, { type: "configure", program });
    sendWorkletMessage(processor, { type: "seek", seconds: start });
    sendWorkletMessage(processor, { type: "active", value: true });
    processor.fade = 1;
    for (let block = 0; block < 12; block += 1) {
      const outputs = createWorkletOutputs(128);
      processor.process([], outputs);
      for (let frame = 0; frame < 128; frame += 1) {
        const expected = renderPikoSample(
          program,
          start + (block * 128 + frame) / sampleRate,
          sampleRate,
        );
        expect(outputs[0]![0]![frame]).toBeCloseTo(expected.dryLeft, 7);
        expect(outputs[0]![1]![frame]).toBeCloseTo(expected.dryRight, 7);
        expect(outputs[1]![0]![frame]).toBeCloseTo(expected.wetLeft, 7);
        expect(outputs[1]![1]![frame]).toBeCloseTo(expected.wetRight, 7);
      }
    }
  });
});
