import { describe, expect, it } from "vitest";

import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
  evaluateMusicalScore,
} from "../audio/musicalScore";
import { RESIDUE_BLOOM_SERIES, RESIDUE_BLOOM_VISUAL_ANGULAR_RATE } from "../math/fourier";
import { getResidueBloomVisualResponse } from "./residueBloomVisualResponse";

const score = buildMusicalScoreProgram(
  RESIDUE_BLOOM_SCORE_DEFINITION,
  RESIDUE_BLOOM_SERIES,
  55,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
);

describe("Residue Bloom poetic visual response", () => {
  it("is visibly stronger on a bloom phrase accent than during hush", () => {
    const bloom = getResidueBloomVisualResponse(evaluateMusicalScore(score, 60.02));
    const hush = getResidueBloomVisualResponse(evaluateMusicalScore(score, 111.02));

    expect(bloom.haloScale).toBeGreaterThan(hush.haloScale);
    expect(bloom.bloomBoost).toBeGreaterThan(hush.bloomBoost);
    expect(bloom.membraneDisplacement).toBeGreaterThan(hush.membraneDisplacement);
    expect(bloom.flowEnergy).toBeGreaterThan(hush.flowEnergy);
  });

  it("keeps every poetic control inside its declared bound", () => {
    for (let time = 0; time < score.cycleSeconds; time += 0.03125) {
      const response = getResidueBloomVisualResponse(evaluateMusicalScore(score, time));

      expect(response.haloScale).toBeGreaterThanOrEqual(0.82);
      expect(response.haloScale).toBeLessThanOrEqual(1.75);
      expect(response.haloOpacity).toBeGreaterThanOrEqual(0.08);
      expect(response.haloOpacity).toBeLessThanOrEqual(0.34);
      expect(response.bloomBoost).toBeGreaterThanOrEqual(0);
      expect(response.bloomBoost).toBeLessThanOrEqual(0.22);
      expect(response.membraneDisplacement).toBeGreaterThanOrEqual(0);
      expect(response.membraneDisplacement).toBeLessThanOrEqual(0.18);
      expect(response.warmth).toBeGreaterThanOrEqual(0);
      expect(response.warmth).toBeLessThanOrEqual(1);
    }
  });

  it("does not expose controls that can deform the exact mathematical layer", () => {
    const response = getResidueBloomVisualResponse(evaluateMusicalScore(score, 60.02));

    expect(response).not.toHaveProperty("endpointX");
    expect(response).not.toHaveProperty("endpointY");
    expect(response).not.toHaveProperty("epicycleScale");
    expect(response).not.toHaveProperty("waveScale");
    expect(response).not.toHaveProperty("cameraOffset");
  });
});
