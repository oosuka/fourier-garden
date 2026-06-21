import { describe, expect, it } from "vitest";

import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
} from "../patterns/residue-bloom/audio/score";
import {
  RESIDUE_BLOOM_AUDIO_GRAPH,
  createResidueBloomAudioProgram,
} from "../patterns/residue-bloom/audio/synthesis";
import {
  RESIDUE_BLOOM_SERIES,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
} from "../patterns/residue-bloom/math/model";
import { createWorkletConfigureMessage } from "./audioProgram";
import { MOBIUS_CHOIR_AUDIO_GRAPH, createMobiusChoirAudioProgram } from "./mobiusChoirSynthesis";

const score = buildMusicalScoreProgram(
  RESIDUE_BLOOM_SCORE_DEFINITION,
  RESIDUE_BLOOM_SERIES,
  55,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
);

describe("Residue Bloom audio program", () => {
  it("preserves the existing AudioEngine graph exactly", () => {
    expect(RESIDUE_BLOOM_AUDIO_GRAPH).toEqual({
      dryHighPassHz: 125,
      dryHighPassQ: 0.45,
      dryHighShelfHz: 3_200,
      dryHighShelfGainDb: -2.2,
      dryLowPassHz: 4_600,
      dryLowPassQ: 0.3,
      dryGain: 0.88,
      wetHighPassHz: 180,
      wetHighPassQ: 0.45,
      wetGain: 0.16,
      roomSeconds: 1.9,
      roomDecay: 3.4,
      compressor: {
        thresholdDb: -12,
        kneeDb: 12,
        ratio: 3,
        attackSeconds: 0.006,
        releaseSeconds: 0.2,
      },
      limiterCeilingDbfs: null,
    });
  });

  it("wraps the legacy score in a discriminated worklet program", () => {
    const program = createResidueBloomAudioProgram(score);

    expect(program.worklet.kind).toBe("residue-bloom");
    expect(program.graph).toEqual(RESIDUE_BLOOM_AUDIO_GRAPH);
    expect(createWorkletConfigureMessage(program.worklet)).toEqual({
      type: "configure",
      program: program.worklet,
    });
  });
});

describe("Möbius Choir audio program", () => {
  it("wraps the six-mode score in the chapter-specific graph", () => {
    const program = createMobiusChoirAudioProgram();
    expect(program.worklet.kind).toBe("mobius-choir");
    expect(program.graph).toEqual(MOBIUS_CHOIR_AUDIO_GRAPH);
    expect(createWorkletConfigureMessage(program.worklet)).toEqual({
      type: "configure",
      program: program.worklet,
    });
  });
});
