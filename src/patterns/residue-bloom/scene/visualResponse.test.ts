import { describe, expect, it } from "vitest";

import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
  evaluateMusicalScore,
} from "../audio/score";
import { RESIDUE_BLOOM_SERIES, RESIDUE_BLOOM_VISUAL_ANGULAR_RATE } from "../math/model";
import { getResidueBloomVisualResponse } from "./visualResponse";

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
      expect(response.coronaStrength).toBeGreaterThanOrEqual(0);
      expect(response.coronaStrength).toBeLessThanOrEqual(1);
      expect(response.spokeNodeOpacity).toBeGreaterThanOrEqual(0);
      expect(response.spokeNodeOpacity).toBeLessThanOrEqual(1);
      expect(response.historyPulseOpacity).toBeGreaterThanOrEqual(0);
      expect(response.historyPulseOpacity).toBeLessThanOrEqual(1);
    }
  });

  it("does not expose controls that can deform the exact mathematical layer", () => {
    const response = getResidueBloomVisualResponse(evaluateMusicalScore(score, 60.02));

    expect(response).not.toHaveProperty("endpointX");
    expect(response).not.toHaveProperty("endpointY");
    expect(response).not.toHaveProperty("epicycleScale");
    expect(response).not.toHaveProperty("waveScale");
    expect(response).not.toHaveProperty("waveProgressScale");
    expect(response).not.toHaveProperty("phaseOffset");
    expect(response).not.toHaveProperty("cameraOffset");
  });

  it("makes the phrase-opening bloom accent at least ten percent stronger", () => {
    const phraseOpening = getResidueBloomVisualResponse(evaluateMusicalScore(score, 60.02));
    const followingNote = getResidueBloomVisualResponse(evaluateMusicalScore(score, 60.2075));

    expect(phraseOpening.haloScale).toBeGreaterThan(followingNote.haloScale * 1.1);
  });

  it("drives corona, nodes, and history pulses from score impact", () => {
    const bloom = getResidueBloomVisualResponse(evaluateMusicalScore(score, 60.02));
    const decay = getResidueBloomVisualResponse(evaluateMusicalScore(score, 60.16));

    expect(bloom.coronaStrength).toBeGreaterThan(decay.coronaStrength);
    expect(bloom.spokeNodeOpacity).toBeGreaterThan(decay.spokeNodeOpacity);
    expect(bloom.historyPulseOpacity).toBeGreaterThan(decay.historyPulseOpacity);
  });

  it("keeps the phrase-opening math overlay stronger than the following phrase", () => {
    const phraseOpening = getResidueBloomVisualResponse(evaluateMusicalScore(score, 60.02));
    const followingNote = getResidueBloomVisualResponse(evaluateMusicalScore(score, 60.2075));

    expect(phraseOpening.coronaStrength).toBeGreaterThan(followingNote.coronaStrength * 1.1);
    expect(phraseOpening.historyPulseOpacity).toBeGreaterThan(
      followingNote.historyPulseOpacity * 1.1,
    );
  });

  it("returns the final bar toward the intro density and brightness", () => {
    const introFrame = evaluateMusicalScore(score, 0.02);
    const denseReturnFrame = evaluateMusicalScore(score, 132.02);
    const finalReturnFrame = evaluateMusicalScore(score, 143.95);
    const intro = getResidueBloomVisualResponse(introFrame);
    const denseReturn = getResidueBloomVisualResponse(denseReturnFrame);
    const finalReturn = getResidueBloomVisualResponse(finalReturnFrame);

    expect(Math.abs(finalReturn.sectionDensity - intro.sectionDensity)).toBeLessThan(
      Math.abs(denseReturn.sectionDensity - intro.sectionDensity),
    );
    expect(
      Math.abs(finalReturnFrame.event.baseBrightness - introFrame.event.baseBrightness),
    ).toBeLessThan(
      Math.abs(denseReturnFrame.event.baseBrightness - introFrame.event.baseBrightness),
    );
  });

  it("keeps all controls finite at boundaries and several cycles later", () => {
    const times = [0, 24, 60, 96, 120, 143.999, 144, 144 * 7 + 60.02];

    for (const time of times) {
      const response = getResidueBloomVisualResponse(evaluateMusicalScore(score, time));
      expect(Object.values(response).every(Number.isFinite)).toBe(true);
    }
  });
});
