import { describe, expect, it } from "vitest";

import { SPECTRAL_CATHEDRAL_SCORE } from "../audio/score";
import { createSpectralCathedralLightAnchors } from "./poetic";
import {
  createSpectralCathedralModeInfluenceMatrix,
  evaluateSpectralCathedralVisualFrame,
} from "./visualResponse";

const anchors = createSpectralCathedralLightAnchors();
const matrix = createSpectralCathedralModeInfluenceMatrix(anchors);

describe("Spectral Cathedral visual response", () => {
  it("maps modes to distinct bounded pillar influence patterns", () => {
    const rows = [1, 4, 8, 12].map((modeId) => matrix.byModeId.get(modeId)!);

    expect(new Set(rows.map((row) => row.map((value) => value.toFixed(6)).join(","))).size).toBe(
      rows.length,
    );
    for (const row of rows) {
      expect(row).toHaveLength(7);
      expect(row.every((value) => value >= 0 && value <= 1 && Number.isFinite(value))).toBe(true);
    }
  });

  it("excites a local pillar set instead of every pillar equally", () => {
    const frame = evaluateSpectralCathedralVisualFrame(0.08, matrix);
    const impacts = frame.pillars.map((pillar) => pillar.impact);

    expect(Math.max(...impacts) - Math.min(...impacts)).toBeGreaterThan(0.2);
  });

  it("propagates energy through arches with index-dependent timing", () => {
    const frame = evaluateSpectralCathedralVisualFrame(0.24, matrix);

    expect(new Set(frame.arches.map((arch) => arch.energy.toFixed(6))).size).toBeGreaterThan(1);
    expect(frame.arches.some((arch) => arch.progress > 0 && arch.progress < 1)).toBe(true);
  });

  it("exposes onset and collective energy for scene-wide audiovisual pulses", () => {
    const idle = evaluateSpectralCathedralVisualFrame(0, matrix);
    const onset = evaluateSpectralCathedralVisualFrame(0.04, matrix);
    const afterglow = evaluateSpectralCathedralVisualFrame(0.18, matrix);

    expect(idle.onsetEnergy).toBeLessThan(0.05);
    expect(onset.onsetEnergy).toBeGreaterThan(0.5);
    expect(onset.collectiveEnergy).toBeGreaterThan(afterglow.collectiveEnergy);
    expect(afterglow.collectiveEnergy).toBeGreaterThan(afterglow.onsetEnergy);
  });

  it("repeats the poetic score while absolute mathematics remains independent", () => {
    const first = evaluateSpectralCathedralVisualFrame(
      SPECTRAL_CATHEDRAL_SCORE.cycleSeconds + 0.08,
      matrix,
    );
    const next = evaluateSpectralCathedralVisualFrame(
      SPECTRAL_CATHEDRAL_SCORE.cycleSeconds * 2 + 0.08,
      matrix,
    );

    const firstValues = [
      first.dramaturgy.audioEnergy,
      first.dramaturgy.visualEnergy,
      first.dramaturgy.motionEnergy,
      first.collectiveEnergy,
      first.onsetEnergy,
      ...first.pillars.flatMap(Object.values),
      ...first.arches.flatMap(Object.values),
      ...first.particles.flatMap(Object.values),
    ];
    const nextValues = [
      next.dramaturgy.audioEnergy,
      next.dramaturgy.visualEnergy,
      next.dramaturgy.motionEnergy,
      next.collectiveEnergy,
      next.onsetEnergy,
      ...next.pillars.flatMap(Object.values),
      ...next.arches.flatMap(Object.values),
      ...next.particles.flatMap(Object.values),
    ];
    expect(next.dramaturgy.sectionId).toBe(first.dramaturgy.sectionId);
    nextValues.forEach((value, index) => expect(value).toBeCloseTo(firstValues[index]!, 12));
  });

  it("keeps every visual control finite and bounded", () => {
    for (let time = 0; time < 90; time += 0.125) {
      const frame = evaluateSpectralCathedralVisualFrame(time, matrix);
      const values = [
        frame.collectiveEnergy,
        frame.onsetEnergy,
        ...frame.pillars.flatMap(Object.values),
        ...frame.arches.flatMap(Object.values),
        ...frame.particles.flatMap(Object.values),
      ];
      expect(values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(
        true,
      );
    }
  });

  it("rejects invalid absolute time", () => {
    expect(() => evaluateSpectralCathedralVisualFrame(-1, matrix)).toThrow(/time/i);
    expect(() => evaluateSpectralCathedralVisualFrame(Number.NaN, matrix)).toThrow(/time/i);
  });
});
