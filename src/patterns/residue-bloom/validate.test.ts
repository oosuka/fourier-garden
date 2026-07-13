import { describe, expect, it } from "vitest";

import { residueBloomPattern } from "./definition";
import type { ResidueBloomPatternDefinition } from "./types";
import { validateResidueBloomPattern } from "./validate";

function mutate(
  change: (pattern: ResidueBloomPatternDefinition) => ResidueBloomPatternDefinition,
): ResidueBloomPatternDefinition {
  return change(residueBloomPattern);
}

describe("Residue Bloom validation", () => {
  it("accepts the registered definition", () => {
    expect(() => validateResidueBloomPattern(residueBloomPattern)).not.toThrow();
  });

  it("rejects score-wrapped mathematical time", () => {
    const invalid = mutate((pattern) => ({
      ...pattern,
      mathematics: {
        ...pattern.mathematics,
        visualTime: { ...pattern.mathematics.visualTime, wrapsWithScore: true as never },
      },
    }));

    expect(() => validateResidueBloomPattern(invalid)).toThrow(/mathematical time/i);
  });

  it("rejects score mapping rates and terms that differ from the formula", () => {
    const rateMismatch = mutate((pattern) => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          phasorMapping: { ...pattern.audio.score.phasorMapping, visualAngularRate: 0.5 },
        },
      },
    }));
    const termMismatch = mutate((pattern) => ({
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

    expect(() => validateResidueBloomPattern(rateMismatch)).toThrow(/visual angular rate/i);
    expect(() => validateResidueBloomPattern(termMismatch)).toThrow(/phasor mapping terms/i);
  });

  it("rejects spectrum reference and phasor amplitude-bound disagreements", () => {
    const referenceMismatch = mutate((pattern) => ({
      ...pattern,
      mathematics: {
        ...pattern.mathematics,
        spectrum: { ...pattern.mathematics.spectrum, referenceFrequencyHz: 110 },
      },
    }));
    const boundMismatch = mutate((pattern) => ({
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

    expect(() => validateResidueBloomPattern(referenceMismatch)).toThrow(/reference frequency/i);
    expect(() => validateResidueBloomPattern(boundMismatch)).toThrow(/phasor amplitude bound/i);
  });

  it("rejects evaluated phasor values in repeating events", () => {
    const invalid = mutate((pattern) => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          events: pattern.audio.score.events.map((event, index) =>
            index === 0
              ? (Object.assign({}, event, { normalizedPhasorX: 0 }) as typeof event)
              : event,
          ),
        },
      },
    }));

    expect(() => validateResidueBloomPattern(invalid)).toThrow(/evaluated phasor data/i);
  });
});
