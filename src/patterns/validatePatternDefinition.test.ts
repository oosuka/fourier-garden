import { describe, expect, it } from "vitest";

import { patternRegistry } from "./registry";
import type { PatternDefinition } from "./types";
import { validatePatternDefinition } from "./validatePatternDefinition";

function mutatePattern(
  mutate: (pattern: PatternDefinition) => PatternDefinition,
): PatternDefinition {
  return mutate(patternRegistry[0]!);
}

describe("pattern mathematical provenance", () => {
  it("accepts Residue Bloom", () => {
    expect(() => validatePatternDefinition(patternRegistry[0]!)).not.toThrow();
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
    const pattern = patternRegistry[0]!;
    const invalid = mutatePattern(() => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          phasorMapping: {
            ...pattern.audio.score.phasorMapping,
            terms: pattern.audio.score.phasorMapping.terms.map((term, index) =>
              index === 0 ? { ...term, amplitude: term.amplitude + 1 } : term,
            ),
          },
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(/phasor mapping terms/i);
  });

  it("rejects a phasor amplitude bound that differs from the formula", () => {
    const pattern = patternRegistry[0]!;
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
    const pattern = patternRegistry[0]!;
    const invalid = mutatePattern(() => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          events: pattern.audio.score.events.map((event, index) =>
            index === 0 ? ({ ...event, normalizedPhasorX: 0 } as typeof event) : event,
          ),
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(
      /repeat event contains evaluated phasor data/i,
    );
  });
});
