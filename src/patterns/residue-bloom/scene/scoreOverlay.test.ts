import { describe, expect, it } from "vitest";

import { projectSeriesToVerticalAxis } from "../../../math/fourierSeries";
import { RESIDUE_BLOOM_SERIES, RESIDUE_BLOOM_VISUAL_ANGULAR_RATE } from "../math/model";
import {
  RESIDUE_BLOOM_CORONA_WEIGHTS,
  getCoronaOpacity,
  getCoronaPresentation,
  getHistoryPulsePoint,
  getHistoryPulseWindow,
  getPhraseColorHex,
  getRendererVisibilityScale,
  getWaveTrailVerticalDrift,
} from "./scoreOverlay";

describe("Residue Bloom score overlay", () => {
  it("keeps thirteen normalized perceptual harmonic weights", () => {
    expect(RESIDUE_BLOOM_CORONA_WEIGHTS).toHaveLength(13);
    expect(RESIDUE_BLOOM_CORONA_WEIGHTS[0]).toBeCloseTo(1, 12);

    for (let index = 1; index < RESIDUE_BLOOM_CORONA_WEIGHTS.length; index += 1) {
      expect(RESIDUE_BLOOM_CORONA_WEIGHTS[index]).toBeLessThan(
        RESIDUE_BLOOM_CORONA_WEIGHTS[index - 1]!,
      );
    }

    expect(RESIDUE_BLOOM_CORONA_WEIGHTS[12]).toBeGreaterThan(0);
  });

  it("maps normalized weights to bounded appearance only", () => {
    expect(getCoronaOpacity(1, 0.8)).toBeGreaterThan(
      getCoronaOpacity(RESIDUE_BLOOM_CORONA_WEIGHTS[12]!, 0.8),
    );
    expect(getCoronaOpacity(1, 0.8)).toBeLessThanOrEqual(1);
    expect(getCoronaOpacity(0, 0)).toBe(0);
  });

  it("uses stable phrase colors with a warm opening", () => {
    expect(getPhraseColorHex(0)).toBe(0xffc782);
    expect(getPhraseColorHex(1)).not.toBe(getPhraseColorHex(0));
    expect(getPhraseColorHex(4)).toBe(getPhraseColorHex(0));
  });

  it("keeps corona presentation free of geometry deformation data", () => {
    const presentation = getCoronaPresentation(0, 0.8, 0);

    expect(presentation).toEqual({
      opacity: getCoronaOpacity(RESIDUE_BLOOM_CORONA_WEIGHTS[0]!, 0.8),
      colorHex: 0xffc782,
    });
    expect(presentation).not.toHaveProperty("x");
    expect(presentation).not.toHaveProperty("y");
    expect(presentation).not.toHaveProperty("scale");
    expect(presentation).not.toHaveProperty("phase");
  });

  it("projects history pulse points with the exact primary waveform equation", () => {
    const point = getHistoryPulsePoint({
      timeSeconds: 144.02,
      progress: 0.02 / 8.6,
      waveStartX: 4.8,
      waveEndX: 14.2,
      centerY: 0.35,
      scale: 0.42,
    });
    const historyAngle = (144.02 - point.progress * 8.6) * RESIDUE_BLOOM_VISUAL_ANGULAR_RATE;

    expect(point.y).toBeCloseTo(
      projectSeriesToVerticalAxis(RESIDUE_BLOOM_SERIES, historyAngle, 0.35, 0.42),
      12,
    );
    expect(point.x).toBeCloseTo(4.8 + point.progress * (14.2 - 4.8), 12);
  });

  it("maps recent impulse age to a bounded history window", () => {
    const window = getHistoryPulseWindow(0.375);

    expect(window.centerProgress).toBeCloseTo(0.375 / 8.6, 12);
    expect(window.startProgress).toBeGreaterThanOrEqual(0);
    expect(window.endProgress).toBeLessThanOrEqual(1);
    expect(window.startProgress).toBeLessThan(window.centerProgress);
    expect(window.endProgress).toBeGreaterThan(window.centerProgress);
  });

  it("keeps exact history projection finite across the score loop boundary", () => {
    for (const timeSeconds of [143.99, 144.01]) {
      const point = getHistoryPulsePoint({
        timeSeconds,
        progress: 0.035,
        waveStartX: 1.1,
        waveEndX: 15.5,
        centerY: 0.35,
        scale: 0.54,
      });

      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
      expect(point.y).toBeCloseTo(
        projectSeriesToVerticalAxis(
          RESIDUE_BLOOM_SERIES,
          (timeSeconds - point.progress * 8.6) * RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
          0.35,
          0.54,
        ),
        12,
      );
    }
  });

  it("keeps the strict primary waveform free of poetic vertical drift", () => {
    expect(getWaveTrailVerticalDrift(10, 0)).toBe(0);
    expect(Math.abs(getWaveTrailVerticalDrift(10, 1))).toBeGreaterThan(0);
  });

  it("compensates poetic overlay opacity only on WebGL", () => {
    expect(getRendererVisibilityScale("webgpu")).toBe(1);
    expect(getRendererVisibilityScale("webgl")).toBeCloseTo(1.32, 12);
  });
});
