import { describe, expect, it } from "vitest";

import { projectSeriesToVerticalAxis } from "../../../math/fourierSeries";
import { RESIDUE_BLOOM_SERIES } from "../math/model";
import { getResidueBloomCinematicCounts, getResidueBloomPrimaryWavePoint } from "./scene";

describe("Residue Bloom cinematic scene", () => {
  it("matches every approved total particle budget", () => {
    expect(getResidueBloomCinematicCounts("low")).toEqual({
      localParticles: 2_400,
      burstParticles: 384,
      environmentParticles: 5_216,
      totalParticles: 8_000,
    });
    expect(getResidueBloomCinematicCounts("medium").totalParticles).toBe(18_000);
    expect(getResidueBloomCinematicCounts("high").totalParticles).toBe(32_000);
    expect(getResidueBloomCinematicCounts("ultra")).toEqual({
      localParticles: 7_200,
      burstParticles: 384,
      environmentParticles: 40_416,
      totalParticles: 48_000,
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

  it("rejects invalid primary waveform inputs", () => {
    expect(() => getResidueBloomPrimaryWavePoint(Number.NaN, 0.5, 0, 1, 0, 1)).toThrow(/finite/i);
    expect(() => getResidueBloomPrimaryWavePoint(1, -0.1, 0, 1, 0, 1)).toThrow(/progress/i);
  });
});
