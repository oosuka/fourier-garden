import { describe, expect, it } from "vitest";

import { getEpicycleSteps, projectSeriesToVerticalAxis } from "../../../math/fourierSeries";
import { RESIDUE_BLOOM_SERIES } from "../math/model";
import {
  getResidueBloomCinematicCounts,
  getResidueBloomLocalParticleCount,
  getResidueBloomPrimaryWavePoint,
} from "./scene";
import { getResidueBloomSceneLayout, writeResidueBloomFlowPositions } from "./spatialModel";

describe("Residue Bloom cinematic scene", () => {
  it("fits every circle and the waveform in desktop and observation-note viewports", () => {
    for (const aspect of [0.75, 840 / 818, 16 / 10, 16 / 9, 21 / 9]) {
      const layout = getResidueBloomSceneLayout(aspect);
      for (let index = 0; index <= 120; index++) {
        for (const circle of getEpicycleSteps(RESIDUE_BLOOM_SERIES, (index * Math.PI) / 60)) {
          const x = layout.centerX + circle.originX * layout.scale;
          const y = layout.centerY + circle.originY * layout.scale;
          const radius = circle.radius * layout.scale;
          expect(x - radius).toBeGreaterThanOrEqual(-10 * aspect * 0.96);
          expect(x + radius).toBeLessThan(layout.waveStart);
          expect(Math.abs(y) + radius).toBeLessThan(8);
        }
      }
      expect(layout.waveEnd).toBeLessThan(10 * aspect);
      expect(layout.waveEnd - layout.waveStart).toBeGreaterThan(10 * aspect * 0.6);
    }
  });

  it("fixes decorative flow in reduced motion even as time and the mathematical endpoint change", () => {
    const seeds = new Float32Array([0.12, 0.3, 0.6, 1.2, 0.47, 0.6, 0.2, 3.7]);
    const first = new Float32Array(6);
    const later = new Float32Array(6);
    writeResidueBloomFlowPositions(first, seeds, 2, 0.1, 0.8, 4, 3, true);
    writeResidueBloomFlowPositions(later, seeds, 2, 19.4, 0.2, -6, -2, true);
    expect(later).toEqual(first);
  });

  it("does not amplify a small excitation change into a large positional jump after hours", () => {
    const seeds = new Float32Array([0.12, 0.3, 0.6, 1.2, 0.47, 0.6, 0.2, 3.7]);
    const first = new Float32Array(6);
    const later = new Float32Array(6);
    writeResidueBloomFlowPositions(first, seeds, 2, 10_000, 0.4, 4, 3);
    writeResidueBloomFlowPositions(later, seeds, 2, 10_000, 0.4001, 4, 3);
    expect(Math.max(...later.map((value, index) => Math.abs(value - first[index]!)))).toBeLessThan(
      0.001,
    );
  });

  it("matches every approved total particle budget", () => {
    expect(getResidueBloomCinematicCounts("low")).toEqual({
      localParticles: 4_000,
      burstParticles: 768,
      environmentParticles: 9_232,
      totalParticles: 14_000,
    });
    expect(getResidueBloomCinematicCounts("medium").totalParticles).toBe(32_000);
    expect(getResidueBloomCinematicCounts("high").totalParticles).toBe(64_000);
    expect(getResidueBloomCinematicCounts("ultra")).toEqual({
      localParticles: 12_000,
      burstParticles: 768,
      environmentParticles: 83_232,
      totalParticles: 96_000,
    });
  });

  it("keeps the primary waveform on the exact sampled series", () => {
    const point = getResidueBloomPrimaryWavePoint(31.25, 0.42, 4.8, 14.2, 0.35, 0.54);

    expect(point.x).toBeCloseTo(8.748, 12);
    expect(point.y).toBeCloseTo(
      projectSeriesToVerticalAxis(RESIDUE_BLOOM_SERIES, point.angle, 0.35, 0.54),
      12,
    );
  });

  it("caps local poetic flow particles on the WebGL fallback path", () => {
    expect(getResidueBloomLocalParticleCount("high", "webgpu")).toBe(9_000);
    expect(getResidueBloomLocalParticleCount("high", "webgl")).toBe(7_000);
    expect(getResidueBloomLocalParticleCount("ultra", "webgl")).toBe(9_000);
  });

  it("rejects invalid primary waveform inputs", () => {
    expect(() => getResidueBloomPrimaryWavePoint(Number.NaN, 0.5, 0, 1, 0, 1)).toThrow(/finite/i);
    expect(() => getResidueBloomPrimaryWavePoint(1, -0.1, 0, 1, 0, 1)).toThrow(/progress/i);
  });
});
