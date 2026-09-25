import { describe, expect, it } from "vitest";
import {
  createWorkletOutputs,
  loadWorkletProcessor,
  sendWorkletMessage,
} from "../../../test-support/workletHarness";
import { RESIDUE_BLOOM_SERIES, RESIDUE_BLOOM_VISUAL_ANGULAR_RATE } from "../math/model";
import { RESIDUE_BLOOM_SCORE_DEFINITION, buildMusicalScoreProgram } from "./score";
import { createWorkletConfiguration } from "./synthesis";
import { createResidueBloomRuntime, renderResidueBloomSample } from "./runtime";

const score = buildMusicalScoreProgram(
  RESIDUE_BLOOM_SCORE_DEFINITION,
  RESIDUE_BLOOM_SERIES,
  55,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
);
const program = createWorkletConfiguration(score).program;

describe("Residue overlapping voice runtime", () => {
  it.each([8_000, 44_100, 48_000, 96_000])(
    "reconstructs both dry and per-event wet tails through long and backward seeks at %i Hz",
    (sampleRate) => {
      const processor = loadWorkletProcessor(sampleRate);
      const reference = createResidueBloomRuntime(program, sampleRate);
      expect(reference.voices).toHaveLength(2);
      sendWorkletMessage(processor, { type: "configure", program });
      sendWorkletMessage(processor, { type: "active", value: true });
      for (const requested of [0, 0.17, 143.99, 10_000.125, 0.17]) {
        const start = Math.round(requested * sampleRate) / sampleRate;
        sendWorkletMessage(processor, { type: "seek", seconds: start });
        processor.fade = 1;
        let error = 0;
        for (let block = 0; block < 64; block++) {
          const outputs = createWorkletOutputs(128);
          processor.process([], outputs);
          for (let index = 0; index < 128; index++) {
            const expected = renderResidueBloomSample(
              reference,
              start + (block * 128 + index) / sampleRate,
            );
            error = Math.max(
              error,
              Math.abs(outputs[0]![0]![index]! - expected.dryLeft),
              Math.abs(outputs[0]![1]![index]! - expected.dryRight),
              Math.abs(outputs[1]![0]![index]! - expected.wetLeft),
              Math.abs(outputs[1]![1]![index]! - expected.wetRight),
            );
          }
        }
        expect(error).toBeLessThan(1e-7);
      }
    },
  );

  it("superposes adjacent notes without transferring the new event's wet send to the old tail", () => {
    const first = createResidueBloomRuntime(
      {
        ...program,
        score: {
          ...score,
          events: score.events.map((event, index) => ({
            ...event,
            active: index === 0,
            wetSend: 0.2,
          })),
        },
      },
      48_000,
    );
    const second = createResidueBloomRuntime(
      {
        ...program,
        score: {
          ...score,
          events: score.events.map((event, index) => ({
            ...event,
            active: index === 1,
            wetSend: 0.8,
          })),
        },
      },
      48_000,
    );
    const together = createResidueBloomRuntime(
      {
        ...program,
        score: {
          ...score,
          events: score.events.map((event, index) => ({
            ...event,
            active: index < 2,
            wetSend: index === 0 ? 0.2 : 0.8,
          })),
        },
      },
      48_000,
    );
    for (const time of [0.01, 0.21, 0.24, 0.31, 0.39, 0.56]) {
      const a = renderResidueBloomSample(first, time);
      const b = renderResidueBloomSample(second, time);
      const sum = renderResidueBloomSample(together, time);
      expect(sum.dryLeft).toBeCloseTo(a.dryLeft + b.dryLeft, 12);
      expect(sum.dryRight).toBeCloseTo(a.dryRight + b.dryRight, 12);
      expect(sum.wetLeft).toBeCloseTo(a.dryLeft * 0.1 + b.dryLeft * 0.4, 12);
      expect(sum.wetRight).toBeCloseTo(a.dryRight * 0.1 + b.dryRight * 0.4, 12);
    }
  });

  it("does not invent a preceding cycle at time zero or retain a filter tail after a note ends", () => {
    const isolated = {
      ...program,
      score: {
        ...score,
        events: score.events.map((event, index) =>
          Object.assign({}, event, {
            active: index === 0 || index === score.totalSteps - 1,
          }),
        ),
      },
    };
    const reference = createResidueBloomRuntime(isolated, 48_000);
    expect(renderResidueBloomSample(reference, 0)).toEqual({
      dryLeft: 0,
      dryRight: 0,
      wetLeft: 0,
      wetRight: 0,
    });
    expect(renderResidueBloomSample(reference, 0.4)).toEqual({
      dryLeft: 0,
      dryRight: 0,
      wetLeft: 0,
      wetRight: 0,
    });
    expect(Math.abs(renderResidueBloomSample(reference, 144).dryLeft)).toBeGreaterThan(0.001);
  });
});
