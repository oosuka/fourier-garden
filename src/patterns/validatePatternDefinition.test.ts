import { describe, expect, it, vi } from "vitest";

import type { PatternDefinition } from "./contracts";
import { patternPreviewRegistry, patternRegistry } from "./registry";
import { validatePatternDefinition } from "./validatePatternDefinition";

function getCommonPattern(): PatternDefinition {
  const pattern = patternRegistry[0];
  if (!pattern) throw new Error("A registered pattern is required");
  return {
    ...pattern,
    validate() {},
  };
}

describe("pattern definition common validation", () => {
  it("accepts every registered definition", () => {
    for (const pattern of patternPreviewRegistry) {
      expect(() => validatePatternDefinition(pattern)).not.toThrow();
    }
  });

  it("calls the chapter-owned validator after common validation", () => {
    const validate = vi.fn<() => void>();
    const pattern = { ...getCommonPattern(), validate };

    validatePatternDefinition(pattern);

    expect(validate).toHaveBeenCalledOnce();
  });

  it("rejects invalid identity and presentation metadata", () => {
    const pattern = getCommonPattern();

    expect(() => validatePatternDefinition({ ...pattern, id: "" })).toThrow(/identity/i);
    expect(() =>
      validatePatternDefinition({
        ...pattern,
        presentation: { ...pattern.presentation, annotations: [] },
      }),
    ).toThrow(/four annotations/i);
  });

  it("requires sonification as the audio role", () => {
    const pattern = {
      ...getCommonPattern(),
      audio: { ...getCommonPattern().audio, mode: "source-signal" },
    } as unknown as PatternDefinition;

    expect(() => validatePatternDefinition(pattern)).toThrow(/sonification/i);
  });

  it("rejects a published pattern without three continuous dramaturgy sections", () => {
    const pattern = getCommonPattern();
    const invalid = {
      ...pattern,
      dramaturgy: {
        ...pattern.dramaturgy,
        sections: [
          {
            id: "only",
            startRatio: 0,
            endRatio: 1,
            audioEnergy: 0.5,
            visualEnergy: 0.5,
            motionEnergy: 0.5,
          },
        ],
      },
    };

    expect(() => validatePatternDefinition(invalid)).toThrow(/at least three sections/i);
  });

  it("rejects dramaturgy without measurable contrast", () => {
    const pattern = getCommonPattern();
    const section = {
      audioEnergy: 0.5,
      visualEnergy: 0.5,
      motionEnergy: 0.5,
    };
    const invalid = {
      ...pattern,
      dramaturgy: {
        ...pattern.dramaturgy,
        sections: [
          { id: "a", startRatio: 0, endRatio: 0.3, ...section },
          { id: "b", startRatio: 0.3, endRatio: 0.7, ...section },
          { id: "c", startRatio: 0.7, endRatio: 1, ...section },
        ],
      },
    };

    expect(() => validatePatternDefinition(invalid)).toThrow(/contrast/i);
  });

  it("rejects a dramaturgy cycle that differs from the audio score", () => {
    const pattern = getCommonPattern();
    const invalid = {
      ...pattern,
      dramaturgy: {
        ...pattern.dramaturgy,
        cycleSeconds: pattern.audio.score.cycleSeconds + 1,
      },
    };

    expect(() => validatePatternDefinition(invalid)).toThrow(/score cycle/i);
  });

  it("rejects non-finite dramaturgy section boundaries", () => {
    const pattern = getCommonPattern();
    const invalid = {
      ...pattern,
      dramaturgy: {
        ...pattern.dramaturgy,
        sections: pattern.dramaturgy.sections.map((section, index) =>
          index === 0 ? Object.assign({}, section, { startRatio: Number.NaN }) : section,
        ),
      },
    };

    expect(() => validatePatternDefinition(invalid)).toThrow(/continuously cover/i);
  });

  it("requires expressive axes, local math mapping, and every quality guarantee", () => {
    const pattern = getCommonPattern();
    const tooFewAxes = {
      ...pattern,
      dramaturgy: { ...pattern.dramaturgy, expressiveAxes: ["density", "motion"] },
    } as PatternDefinition;
    const noLocalMapping = {
      ...pattern,
      dramaturgy: { ...pattern.dramaturgy, localMathMapping: false },
    };
    const missingQuality = {
      ...pattern,
      dramaturgy: {
        ...pattern.dramaturgy,
        qualityContract: {
          ...pattern.dramaturgy.qualityContract,
          comparableLoudness: false,
        },
      },
    } as unknown as PatternDefinition;

    expect(() => validatePatternDefinition(tooFewAxes)).toThrow(/three expressive axes/i);
    expect(() => validatePatternDefinition(noLocalMapping)).toThrow(/local mathematical mapping/i);
    expect(() => validatePatternDefinition(missingQuality)).toThrow(/experience quality/i);
  });
});
