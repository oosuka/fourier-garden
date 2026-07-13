import { describe, expect, it } from "vitest";

import { createWorkletConfigureMessage } from "./audioProgram";

describe("audio program contract", () => {
  it("creates a generic structured-clone-safe configure message", () => {
    const program = { kind: "test-program", gain: 0.5 };

    expect(createWorkletConfigureMessage(program)).toEqual({
      type: "configure",
      program,
    });
    expect(structuredClone(createWorkletConfigureMessage(program))).toEqual({
      type: "configure",
      program,
    });
  });
});
