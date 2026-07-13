import { describe, expect, it } from "vitest";

import { createMobiusChoirDrawingModel } from "./drawing";
import { createMobiusChoirShellModel } from "./shell";

describe("Möbius Choir poetic shells", () => {
  it("creates symmetric shells without mutating strict positions", () => {
    const drawing = createMobiusChoirDrawingModel();
    const original = drawing.positions.slice();

    const shells = createMobiusChoirShellModel(drawing.positions, drawing.indices, 0.026);

    expect(shells.outer).toHaveLength(drawing.positions.length);
    expect(shells.inner).toHaveLength(drawing.positions.length);
    expect(drawing.positions).toEqual(original);
  });

  it("keeps shell offsets finite and bounded", () => {
    const drawing = createMobiusChoirDrawingModel();
    const shells = createMobiusChoirShellModel(drawing.positions, drawing.indices, 0.026);

    for (let index = 0; index < drawing.vertexCount; index += 1) {
      const offset = index * 3;
      const outerDistance = Math.hypot(
        shells.outer[offset]! - drawing.positions[offset]!,
        shells.outer[offset + 1]! - drawing.positions[offset + 1]!,
        shells.outer[offset + 2]! - drawing.positions[offset + 2]!,
      );
      const innerDistance = Math.hypot(
        shells.inner[offset]! - drawing.positions[offset]!,
        shells.inner[offset + 1]! - drawing.positions[offset + 1]!,
        shells.inner[offset + 2]! - drawing.positions[offset + 2]!,
      );
      expect(outerDistance).toBeCloseTo(0.026, 5);
      expect(innerDistance).toBeCloseTo(0.026, 5);
      expect(Number.isFinite(shells.normals[offset])).toBe(true);
    }
  });

  it("rejects malformed shell input", () => {
    expect(() =>
      createMobiusChoirShellModel(new Float32Array(4), new Uint32Array([0, 1, 2]), 0.02),
    ).toThrow(/positions/i);
    expect(() =>
      createMobiusChoirShellModel(new Float32Array(9), new Uint32Array([0, 1, 2]), 0),
    ).toThrow(/offset/i);
    expect(() =>
      createMobiusChoirShellModel(new Float32Array(9), new Uint32Array([0, 1]), 0.02),
    ).toThrow(/indices/i);
  });
});
