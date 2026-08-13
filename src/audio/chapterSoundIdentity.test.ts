import { describe, expect, it } from "vitest";

import {
  RESIDUE_BLOOM_AUDIO_GRAPH,
  createRhythmPreset,
} from "../patterns/residue-bloom/audio/synthesis";
import {
  SPECTRAL_CATHEDRAL_AUDIO_GRAPH,
  SPECTRAL_CATHEDRAL_SYNTHESIS,
} from "../patterns/spectral-cathedral/audio/synthesis";
import { SPECTRAL_CATHEDRAL_SCORE } from "../patterns/spectral-cathedral/audio/score";
import {
  MOBIUS_CHOIR_AUDIO_GRAPH,
  MOBIUS_CHOIR_SYNTHESIS,
} from "../patterns/mobius-choir/audio/synthesis";
import { MOBIUS_CHOIR_SCORE } from "../patterns/mobius-choir/audio/score";

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

describe("established chapter sound identity", () => {
  it("keeps the three established synthesis graphs in the rounded midrange piko family", () => {
    for (const graph of [
      RESIDUE_BLOOM_AUDIO_GRAPH,
      SPECTRAL_CATHEDRAL_AUDIO_GRAPH,
      MOBIUS_CHOIR_AUDIO_GRAPH,
    ]) {
      expect(graph.dryHighPassHz).toBeGreaterThanOrEqual(170);
      expect(graph.dryHighShelfHz).toBeLessThanOrEqual(1_350);
      expect(graph.dryHighShelfGainDb).toBeLessThanOrEqual(-14);
      expect(graph.dryLowPassHz).toBeLessThanOrEqual(2_200);
      expect(graph.wetLowPassHz).toBeLessThanOrEqual(1_500);
    }

    expect(createRhythmPreset(55).timbreDamping).toBeGreaterThanOrEqual(1.8);
  });

  it("keeps Chapter 2 dry and faceted while Chapter 4 stays wider and more legato", () => {
    const chapter2MaximumEnd = Math.max(
      ...Object.values(SPECTRAL_CATHEDRAL_SYNTHESIS.articulations).map(
        (articulation) => articulation.endSeconds,
      ),
    );
    const chapter4MinimumEnd = Math.min(
      ...Object.values(MOBIUS_CHOIR_SYNTHESIS.articulations).map(
        (articulation) => articulation.endSeconds,
      ),
    );
    const chapter2AverageSpread = average(
      SPECTRAL_CATHEDRAL_SCORE.events.map((event) => event.stereoSpread),
    );
    const chapter4AverageSpread = average(
      MOBIUS_CHOIR_SCORE.events.map((event) => event.stereoSpread),
    );
    const chapter2MaximumWetSend = Math.max(
      ...SPECTRAL_CATHEDRAL_SCORE.events.map((event) => event.wetSend),
    );
    const chapter4MinimumPanMotion = Math.min(
      ...MOBIUS_CHOIR_SCORE.events.map((event) => event.panMotion),
    );
    const chapter4MaximumPanMotion = Math.max(
      ...MOBIUS_CHOIR_SCORE.events.map((event) => event.panMotion),
    );

    expect(chapter2MaximumEnd).toBeLessThanOrEqual(0.155);
    expect(chapter2MaximumWetSend).toBeLessThanOrEqual(0.055);
    expect(chapter4MinimumEnd).toBeGreaterThanOrEqual(0.19);
    expect(chapter4MinimumPanMotion).toBeGreaterThanOrEqual(0.3);
    expect(chapter4MaximumPanMotion).toBeGreaterThanOrEqual(0.7);
    expect(MOBIUS_CHOIR_AUDIO_GRAPH.wetGain).toBeGreaterThanOrEqual(
      SPECTRAL_CATHEDRAL_AUDIO_GRAPH.wetGain * 3,
    );
    expect(chapter4AverageSpread - chapter2AverageSpread).toBeGreaterThanOrEqual(0.5);
  });
});
