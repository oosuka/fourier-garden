import { describe, expect, it } from "vitest";

import { mobiusChoirPattern } from "./definition";
import type { MobiusChoirPatternDefinition } from "./types";
import { validateMobiusChoirPattern } from "./validate";

describe("Möbius Choir validation", () => {
  it("accepts the registered definition", () => {
    expect(() => validateMobiusChoirPattern(mobiusChoirPattern)).not.toThrow();
  });

  it("rejects score-wrapped mathematical time", () => {
    const invalid = {
      ...mobiusChoirPattern,
      mathematics: {
        ...mobiusChoirPattern.mathematics,
        mathematicalTime: {
          ...mobiusChoirPattern.mathematics.mathematicalTime,
          wrapsWithScore: true,
        },
      },
    } as unknown as MobiusChoirPatternDefinition;

    expect(() => validateMobiusChoirPattern(invalid)).toThrow(/mathematical time/i);
  });

  it("rejects a score event that references an unknown mode", () => {
    const invalid = {
      ...mobiusChoirPattern,
      audio: {
        ...mobiusChoirPattern.audio,
        score: {
          ...mobiusChoirPattern.audio.score,
          events: mobiusChoirPattern.audio.score.events.map((event, index) =>
            index === 0 ? Object.assign({}, event, { modeIds: [99] }) : event,
          ),
        },
      },
    } as MobiusChoirPatternDefinition;

    expect(() => validateMobiusChoirPattern(invalid)).toThrow(/unknown mode/i);
  });
});
