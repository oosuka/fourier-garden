import { describe, expect, it } from "vitest";

import { MOBIUS_CHOIR_SCORE } from "../audio/score";
import {
  MOBIUS_CHOIR_SYNTHESIS,
  createMobiusChoirAudioModes,
  createMobiusChoirWorkletProgram,
  getMobiusChoirEnvelope,
  renderMobiusChoirStereo,
} from "../audio/synthesis";
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

  it("includes mora gain and current modal amplitude in the local carrier envelope", () => {
    const event = MOBIUS_CHOIR_SCORE.events[3]!;
    const ageSeconds = 0.08;
    const time = event.localTimeSeconds + ageSeconds;
    const frame = evaluateMobiusChoirVisualFrame(time);
    const articulation = MOBIUS_CHOIR_SYNTHESIS.articulations[event.gesture];
    const audioModes = createMobiusChoirAudioModes();

    for (const modeId of event.modeIds) {
      const mode = audioModes[modeId - 1]!;
      const phase = mode.n * (((modeId - 1) * Math.PI) / 6) - mode.modalAngularFrequency * time;
      const expected =
        getMobiusChoirEnvelope(ageSeconds, event.gesture, MOBIUS_CHOIR_SYNTHESIS) *
        articulation.moraGains[0] *
        event.baseGain *
        mode.normalizedGain *
        (1 -
          event.amplitudeMotionDepth / 2 +
          event.amplitudeMotionDepth * Math.abs(Math.cos(phase)));
      expect(frame.modes[modeId - 1]!.acousticEnergy).toBeCloseTo(expected, 12);
    }
    expect(frame.collectiveEnergy).toBeGreaterThan(0);
    expect(frame.onsetEnergy).toBeGreaterThan(0);
    expect(frame.seamEnergy).toBeGreaterThanOrEqual(0);
    expect(frame.seamEnergy).toBeLessThanOrEqual(1);
  });

  it("keeps the n=0 excitation at a fixed place on the standing mode", () => {
    const early = evaluateMobiusChoirVisualFrame(0.06);
    const later = evaluateMobiusChoirVisualFrame(0.16);
    expect(early.modes[0]!.pulseTravel).toBe(later.modes[0]!.pulseTravel);
  });

  it("reports the overtone balance measured in the sounding voice", () => {
    const program = createMobiusChoirWorkletProgram();
    const voice = renderMobiusChoirStereo({
      program,
      startTimeSeconds: 0.06,
      durationSeconds: 0.04,
      sampleRate: 8_000,
    });
    const mode = program.modes[0]!;
    const frequency =
      mode.baseFrequencyHz * (1 - program.synthesis.stereoDetuneRatio) +
      mode.modalAngularFrequency / (2 * Math.PI);
    const amplitude = (partial: number) => {
      let sine = 0;
      let cosine = 0;
      for (let index = 0; index < voice.left.length; index++) {
        const window = Math.sin((Math.PI * index) / voice.left.length) ** 2;
        const phase = 2 * Math.PI * frequency * partial * (0.06 + index / 8_000);
        sine += voice.left[index]! * window * Math.sin(phase);
        cosine += voice.left[index]! * window * Math.cos(phase);
      }
      return Math.hypot(sine, cosine);
    };
    const frame = evaluateMobiusChoirVisualFrame(0.08);
    const ratio = frame.modes[0]!.overtoneRatio;
    expect(ratio).toBeDefined();
    expect(ratio).toBeGreaterThan(0.025);
    expect(ratio / (1 - ratio)).toBeCloseTo(amplitude(2) / amplitude(1), 2);
  });

  it("derives distinct displacement, velocity, ribbon, and seam controls", () => {
    const frame = evaluateMobiusChoirVisualFrame(28.3);
    const signatures = frame.modes.map((mode) =>
      [mode.displacement, mode.velocity, mode.ribbonWidth, mode.warmth]
        .map((v) => v.toFixed(5))
        .join(","),
    );

    expect(new Set(signatures).size).toBeGreaterThan(2);
  });

  it("adds traveling mode pulses that move after each referenced onset", () => {
    const event = MOBIUS_CHOIR_SCORE.events[1]!;
    const early = evaluateMobiusChoirVisualFrame(event.localTimeSeconds + 0.06);
    const later = evaluateMobiusChoirVisualFrame(event.localTimeSeconds + 0.28);

    for (const modeId of event.modeIds) {
      const earlyMode = early.modes[modeId - 1]!;
      const laterMode = later.modes[modeId - 1]!;
      const travelDelta = Math.abs(laterMode.pulseTravel - earlyMode.pulseTravel);

      expect(earlyMode.pulseEnergy).toBeGreaterThan(0.25);
      expect(Math.min(travelDelta, 1 - travelDelta)).toBeCloseTo(
        (0.22 * ((0.14 * Math.sqrt(5)) / 2)) / (2 * Math.PI),
        12,
      );
    }
    expect(early.modes.some((mode) => mode.pulseEnergy > 0.2)).toBe(true);
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
