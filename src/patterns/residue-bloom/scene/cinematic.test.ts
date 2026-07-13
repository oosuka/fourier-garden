import { describe, expect, it } from "vitest";

import { projectSeriesToVerticalAxis } from "../../../math/fourierSeries";
import { RESIDUE_BLOOM_SERIES } from "../math/model";
import {
  getResidueBloomCinematicCounts,
  getResidueBloomLocalParticleCount,
  getResidueBloomPrimaryWavePoint,
} from "./scene";

describe("Residue Bloom cinematic scene", () => {
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
