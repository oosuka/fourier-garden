import { describe, expect, it } from "vitest";

import { spectralCathedralPattern } from "./definition";
import type { SpectralCathedralPatternDefinition } from "./types";
import { validateSpectralCathedralPattern } from "./validate";

describe("Spectral Cathedral validation", () => {
  it("accepts the registered definition", () => {
    expect(() => validateSpectralCathedralPattern(spectralCathedralPattern)).not.toThrow();
  });

  it("rejects score-wrapped mathematical time", () => {
    const invalid = {
      ...spectralCathedralPattern,
      mathematics: {
        ...spectralCathedralPattern.mathematics,
        mathematicalTime: {
          ...spectralCathedralPattern.mathematics.mathematicalTime,
          wrapsWithScore: true,
        },
      },
    } as unknown as SpectralCathedralPatternDefinition;

    expect(() => validateSpectralCathedralPattern(invalid)).toThrow(/mathematical time/i);
  });

  it("rejects a score event that references an unknown mode", () => {
    const invalid = {
      ...spectralCathedralPattern,
      audio: {
        ...spectralCathedralPattern.audio,
        score: {
          ...spectralCathedralPattern.audio.score,
          events: spectralCathedralPattern.audio.score.events.map((event, index) =>
            index === 0 ? Object.assign({}, event, { modeIds: [1, 99] as const }) : event,
          ),
        },
      },
    } as SpectralCathedralPatternDefinition;

    expect(() => validateSpectralCathedralPattern(invalid)).toThrow(/unknown mode/i);
  });
});
