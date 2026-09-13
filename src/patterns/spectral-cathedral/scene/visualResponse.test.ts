import { describe, expect, it } from "vitest";

import { SPECTRAL_CATHEDRAL_SCORE } from "../audio/score";
import {
  createSpectralCathedralAudioModes,
  getSpectralCathedralBellEnvelope,
} from "../audio/synthesis";
import { createSpectralCathedralLightAnchors } from "./poetic";
import {
  createSpectralCathedralModeInfluenceMatrix,
  evaluateSpectralCathedralVisualFrame,
} from "./visualResponse";

const anchors = createSpectralCathedralLightAnchors();
const matrix = createSpectralCathedralModeInfluenceMatrix(anchors);

describe("Spectral Cathedral visual response", () => {
  it("includes the sounding event and modal gain in the first local excitation", () => {
    const frame = evaluateSpectralCathedralVisualFrame(0.04, matrix);
    const event = SPECTRAL_CATHEDRAL_SCORE.events[0]!;
    const mode = createSpectralCathedralAudioModes().find(
      (candidate) => candidate.id === event.modeIds[0],
    )!;
    // At t=0 all modal displacements are 1, so the shared decay multiplier is 1.2.
    const expected =
      getSpectralCathedralBellEnvelope(0.04, "pulse", undefined, 1.2) *
      event.baseGain *
      mode.normalizedGain;
    expect(Math.max(...frame.pillars.map((pillar) => pillar.impact))).toBeCloseTo(expected, 12);
  });

  it("keeps a quieter modal coefficient in the local response when events overlap", () => {
    const event = SPECTRAL_CATHEDRAL_SCORE.events[1]!;
    const mode = createSpectralCathedralAudioModes().find(
      (candidate) => candidate.id === event.modeIds[0],
    )!;
    const isolatedMatrix = {
      pillarCount: 2,
      byModeId: new Map([
        [SPECTRAL_CATHEDRAL_SCORE.events[0]!.modeIds[0]!, [1, 0]],
        [mode.id, [0, 1]],
      ]),
    };
    const age = 0.04;
    const frame = evaluateSpectralCathedralVisualFrame(
      event.localTimeSeconds + age,
      isolatedMatrix,
    );
    const decayScale =
      0.82 + 0.38 * Math.abs(Math.cos(mode.modalAngularFrequency * event.localTimeSeconds));
    const expected =
      getSpectralCathedralBellEnvelope(age, event.gesture, undefined, decayScale) *
      0.92 *
      event.baseGain *
      mode.normalizedGain;

    expect(mode.normalizedGain).toBeLessThan(1);
    expect(frame.pillars[0]!.impact).toBeGreaterThan(0);
    expect(frame.pillars[1]!.impact).toBeCloseTo(expected, 12);
  });
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

    expect(Math.max(...impacts)).toBeGreaterThan(0);
    expect(Math.min(...impacts)).toBeLessThan(Math.max(...impacts) * 0.5);
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
    expect(onset.onsetEnergy).toBeGreaterThan(afterglow.onsetEnergy);
    expect(onset.collectiveEnergy).toBeGreaterThan(afterglow.collectiveEnergy);
    expect(afterglow.collectiveEnergy).toBeGreaterThan(afterglow.onsetEnergy);
  });

  it("repeats the score's sections while modal excitation follows absolute time", () => {
    const first = evaluateSpectralCathedralVisualFrame(
      SPECTRAL_CATHEDRAL_SCORE.cycleSeconds + 0.08,
      matrix,
    );
    const next = evaluateSpectralCathedralVisualFrame(
      SPECTRAL_CATHEDRAL_SCORE.cycleSeconds * 2 + 0.08,
      matrix,
    );

    expect(next.dramaturgy.sectionId).toBe(first.dramaturgy.sectionId);
    expect(next.dramaturgy.audioEnergy).toBeCloseTo(first.dramaturgy.audioEnergy, 12);
    expect(next.onsetEnergy).not.toBeCloseTo(first.onsetEnergy, 6);
    expect(next.pillars.map((pillar) => pillar.impact)).not.toEqual(
      first.pillars.map((pillar) => pillar.impact),
    );
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
