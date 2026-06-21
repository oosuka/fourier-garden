import { describe, expect, it } from "vitest";

import { MOBIUS_CHOIR_SCORE } from "../audio/score";
import { MOBIUS_CHOIR_SYNTHESIS, getMobiusChoirEnvelope } from "../audio/synthesis";
import { MOBIUS_CHOIR_DEFINITION, evaluateMobiusChoirModeKinematics } from "../math/model";
import { evaluateMobiusChoirVisualFrame } from "./visualResponse";

describe("Möbius Choir local visual response", () => {
  it("excites referenced modes without giving every voice the same maximum", () => {
    const event = MOBIUS_CHOIR_SCORE.events[0]!;
    const frame = evaluateMobiusChoirVisualFrame(event.localTimeSeconds + 0.08);
    const energies = frame.modes.map((mode) => mode.energy);

    expect(Math.max(...energies) - Math.min(...energies)).toBeGreaterThan(0.25);
    for (const modeId of event.modeIds) {
      expect(frame.modes[modeId - 1]!.energy).toBeGreaterThan(0.2);
    }
  });

  it("uses the exact acoustic envelope and exposes collective controls", () => {
    const event = MOBIUS_CHOIR_SCORE.events[0]!;
    const ageSeconds = 0.08;
    const frame = evaluateMobiusChoirVisualFrame(event.localTimeSeconds + ageSeconds);
    const expected =
      getMobiusChoirEnvelope(ageSeconds, event.gesture, MOBIUS_CHOIR_SYNTHESIS) * event.baseGain;

    for (const modeId of event.modeIds) {
      expect(frame.modes[modeId - 1]!.acousticEnergy).toBeCloseTo(expected, 12);
    }
    expect(frame.collectiveEnergy).toBeGreaterThan(0);
    expect(frame.onsetEnergy).toBeGreaterThan(0);
    expect(frame.seamEnergy).toBeGreaterThanOrEqual(0);
    expect(frame.seamEnergy).toBeLessThanOrEqual(1);
  });

  it("derives distinct displacement, velocity, ribbon, and seam controls", () => {
    const frame = evaluateMobiusChoirVisualFrame(28.3);
    const signatures = frame.modes.map((mode) =>
      [mode.displacement, mode.velocity, mode.ribbonWidth, mode.cyanRatio]
        .map((v) => v.toFixed(5))
        .join(","),
    );

    expect(new Set(signatures).size).toBeGreaterThan(2);
  });

  it("shares the exact absolute-time mode kinematics used by the mathematical layer", () => {
    const absoluteTimeSeconds = 28.3;
    const frame = evaluateMobiusChoirVisualFrame(absoluteTimeSeconds);

    for (const [index, mode] of MOBIUS_CHOIR_DEFINITION.modes.entries()) {
      const laneY = (index * Math.PI) / MOBIUS_CHOIR_DEFINITION.modes.length;
      const expected = evaluateMobiusChoirModeKinematics(mode, laneY, absoluteTimeSeconds);
      expect(frame.modes[index]!.mathematicalDisplacement).toBeCloseTo(expected.displacement, 12);
      expect(frame.modes[index]!.mathematicalVelocity).toBeCloseTo(expected.velocity, 12);
    }
  });

  it("keeps distinct local motion alive between accents", () => {
    const frame = evaluateMobiusChoirVisualFrame(2.75);
    const energies = frame.modes.map((mode) => mode.energy);
    const velocities = frame.modes.map((mode) => mode.velocity);

    expect(Math.min(...energies)).toBeGreaterThan(0.04);
    expect(Math.min(...velocities)).toBeGreaterThan(0.02);
    expect(new Set(velocities.map((value) => value.toFixed(4))).size).toBeGreaterThan(3);
  });

  it("makes the five act entrances distinguishable in energy, onset, and space", () => {
    const entrances = MOBIUS_CHOIR_SCORE.sections.map((section) =>
      evaluateMobiusChoirVisualFrame(section.startBar * MOBIUS_CHOIR_SCORE.barSeconds + 0.08),
    );
    const signatures = entrances.map((frame) =>
      [frame.collectiveEnergy, frame.onsetEnergy, frame.seamEnergy, frame.dramaturgy.motionEnergy]
        .map((value) => value.toFixed(3))
        .join(","),
    );

    expect(new Set(signatures).size).toBe(5);
    for (const key of ["collectiveEnergy", "onsetEnergy", "seamEnergy"] as const) {
      const values = entrances.map((frame) => frame[key]);
      expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.3);
    }
  });

  it("keeps all visual controls finite and bounded over two score cycles", () => {
    for (let time = 0; time <= MOBIUS_CHOIR_SCORE.cycleSeconds * 2; time += 0.25) {
      const frame = evaluateMobiusChoirVisualFrame(time);
      const values = frame.modes.flatMap(Object.values);
      expect(values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(
        true,
      );
    }
  });

  it("repeats dramaturgy while absolute event phases remain non-periodic", () => {
    const first = evaluateMobiusChoirVisualFrame(0.2);
    const second = evaluateMobiusChoirVisualFrame(MOBIUS_CHOIR_SCORE.cycleSeconds + 0.2);

    expect(second.dramaturgy.sectionId).toBe(first.dramaturgy.sectionId);
    expect(second.modes).not.toEqual(first.modes);
  });

  it("rejects invalid absolute time", () => {
    expect(() => evaluateMobiusChoirVisualFrame(-1)).toThrow(/time/i);
    expect(() => evaluateMobiusChoirVisualFrame(Number.NaN)).toThrow(/time/i);
  });
});
