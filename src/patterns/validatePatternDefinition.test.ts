import { describe, expect, it } from "vitest";

import { patternPreviewRegistry, patternRegistry } from "./registry";
import type { ResidueBloomPatternDefinition } from "./types";
import { validatePatternDefinition } from "./validatePatternDefinition";

function mutatePattern(
  mutate: (pattern: ResidueBloomPatternDefinition) => ResidueBloomPatternDefinition,
): ResidueBloomPatternDefinition {
  const pattern = patternRegistry[0];
  if (pattern?.kind !== "residue-bloom") throw new Error("Residue Bloom is missing");
  return mutate(pattern);
}

function getResidueBloomPattern(): ResidueBloomPatternDefinition {
  const pattern = patternRegistry[0];
  if (pattern?.kind !== "residue-bloom") throw new Error("Residue Bloom is missing");
  return pattern;
}

describe("pattern mathematical provenance", () => {
  it("rejects a published pattern without three continuous dramaturgy sections", () => {
    const pattern = getResidueBloomPattern();
    const invalid = {
      ...pattern,
      dramaturgy: {
        cycleSeconds: pattern.dramaturgy.cycleSeconds,
        expressiveAxes: ["density", "dynamics", "motion"],
        localMathMapping: true,
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
    } as unknown as ResidueBloomPatternDefinition;

    expect(() => validatePatternDefinition(invalid)).toThrow(/at least three sections/i);
  });

  it("rejects dramaturgy without measurable contrast", () => {
    const pattern = getResidueBloomPattern();
    const section = {
      audioEnergy: 0.5,
      visualEnergy: 0.5,
      motionEnergy: 0.5,
    };
    const invalid = {
      ...pattern,
      dramaturgy: {
        cycleSeconds: pattern.dramaturgy.cycleSeconds,
        expressiveAxes: ["density", "dynamics", "motion"],
        localMathMapping: true,
        sections: [
          { id: "a", startRatio: 0, endRatio: 0.3, ...section },
          { id: "b", startRatio: 0.3, endRatio: 0.7, ...section },
          { id: "c", startRatio: 0.7, endRatio: 1, ...section },
        ],
      },
    } as unknown as ResidueBloomPatternDefinition;

    expect(() => validatePatternDefinition(invalid)).toThrow(/contrast/i);
  });

  it("rejects dramaturgy whose cycle differs from the audio score", () => {
    const pattern = getResidueBloomPattern();
    const invalid = {
      ...pattern,
      dramaturgy: {
        ...pattern.dramaturgy,
        cycleSeconds: pattern.audio.score.cycleSeconds + 1,
      },
    } satisfies ResidueBloomPatternDefinition;

    expect(() => validatePatternDefinition(invalid)).toThrow(/score cycle/i);
  });

  it("rejects non-finite dramaturgy section boundaries", () => {
    const pattern = getResidueBloomPattern();
    const invalid = {
      ...pattern,
      dramaturgy: {
        ...pattern.dramaturgy,
        sections: pattern.dramaturgy.sections.map((section, index) =>
          index === 0 ? Object.assign({}, section, { startRatio: Number.NaN }) : section,
        ),
      },
    } satisfies ResidueBloomPatternDefinition;

    expect(() => validatePatternDefinition(invalid)).toThrow(/continuously cover/i);
  });

  it("accepts Residue Bloom", () => {
    expect(() => validatePatternDefinition(patternRegistry[0]!)).not.toThrow();
  });

  it("accepts the Spectral Cathedral preview definition", () => {
    expect(() => validatePatternDefinition(patternPreviewRegistry[1]!)).not.toThrow();
  });

  it("rejects score-wrapped mathematical time", () => {
    const invalid = mutatePattern((pattern) => ({
      ...pattern,
      mathematics: {
        ...pattern.mathematics,
        visualTime: {
          ...pattern.mathematics.visualTime,
          wrapsWithScore: true as never,
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(
      /mathematical time must not wrap with score/i,
    );
  });

  it("rejects a score phasor rate that differs from the chapter rate", () => {
    const invalid = mutatePattern((pattern) => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          phasorMapping: {
            ...pattern.audio.score.phasorMapping,
            visualAngularRate: 0.5,
          },
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(/visual angular rate/i);
  });

  it("rejects spectrum and audio reference-frequency disagreement", () => {
    const invalid = mutatePattern((pattern) => ({
      ...pattern,
      mathematics: {
        ...pattern.mathematics,
        spectrum: {
          ...pattern.mathematics.spectrum,
          referenceFrequencyHz: 110,
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(/reference frequency/i);
  });

  it("rejects score mapping terms that differ from the formula", () => {
    const pattern = getResidueBloomPattern();
    const invalid = mutatePattern(() => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          phasorMapping: {
            ...pattern.audio.score.phasorMapping,
            terms: pattern.audio.score.phasorMapping.terms.map((term, index) =>
              index === 0
                ? {
                    harmonic: term.harmonic,
                    amplitude: term.amplitude + 1,
                    sinePhase: term.sinePhase,
                  }
                : term,
            ),
          },
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(/phasor mapping terms/i);
  });

  it("rejects a phasor amplitude bound that differs from the formula", () => {
    const pattern = getResidueBloomPattern();
    const invalid = mutatePattern(() => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          phasorMapping: {
            ...pattern.audio.score.phasorMapping,
            amplitudeBound: pattern.audio.score.phasorMapping.amplitudeBound + 1,
          },
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(/phasor amplitude bound/i);
  });

  it("rejects phasor results smuggled into repeating events", () => {
    const pattern = patternRegistry[0];
    if (pattern?.kind !== "residue-bloom") throw new Error("Residue Bloom is missing");
    const invalid = mutatePattern(() => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          events: pattern.audio.score.events.map((event, index) =>
            index === 0
              ? (Object.assign({}, event, {
                  normalizedPhasorX: 0,
                }) as typeof event)
              : event,
          ),
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(
      /repeat event contains evaluated phasor data/i,
    );
  });

  it("rejects score-wrapped Spectral Cathedral mathematical time", () => {
    const pattern = patternPreviewRegistry[1];
    if (pattern?.kind !== "spectral-cathedral") {
      throw new Error("Spectral Cathedral preview is missing");
    }
    const invalid = {
      ...pattern,
      mathematics: {
        ...pattern.mathematics,
        mathematicalTime: {
          ...pattern.mathematics.mathematicalTime,
          wrapsWithScore: true,
        },
      },
    } as unknown as typeof pattern;

    expect(() => validatePatternDefinition(invalid)).toThrow(
      /mathematical time must not wrap with score/i,
    );
  });

  it("rejects a Spectral Cathedral score that references an unknown mode", () => {
    const pattern = patternPreviewRegistry[1];
    if (pattern?.kind !== "spectral-cathedral") {
      throw new Error("Spectral Cathedral preview is missing");
    }
    const invalid = {
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          events: pattern.audio.score.events.map((event, index) =>
            index === 0 ? Object.assign({}, event, { modeIds: [1, 99] as const }) : event,
          ),
        },
      },
    } as typeof pattern;

    expect(() => validatePatternDefinition(invalid)).toThrow(/unknown mode/i);
  });
});
