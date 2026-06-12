import { describe, expect, it } from "vitest";

import { patternRegistry } from "./registry";

describe("pattern registry", () => {
  it("exposes the first chapter without imposing a chapter limit", () => {
    expect(patternRegistry).toHaveLength(1);
    expect(patternRegistry[0]).toMatchObject({
      id: "residue-bloom",
      order: 1,
    });
    expect(patternRegistry[0]?.loadScene).toBeTypeOf("function");
  });
});
