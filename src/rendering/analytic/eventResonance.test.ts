import * as THREE from "three/webgpu";
import { describe, expect, it } from "vitest";

import type { PikoScoreEvent, PikoScoreProgram } from "../../audio/pikoProgram";
import { createEventResonance } from "./eventResonance";

const EVENT: PikoScoreEvent = {
  sourceIndex: 0,
  timeSeconds: 0,
  frequencyHz: 440,
  mathematicalGain: 0.7,
  gain: 0.7,
  pan: 0,
  panMotionDepth: 0,
  panMotionRateRadiansPerSecond: 0,
  panMotionPhaseRadians: 0,
  wet: 0,
  attackSeconds: 0.1,
  decaySeconds: 0.5,
  endSeconds: 1.2,
  phaseOffset: 0,
  phaseDrift: 0,
};

const SCORE: PikoScoreProgram = { cycleSeconds: 8, events: [EVENT] };

function createFixture() {
  const locatedAt: number[] = [];
  const resonance = createEventResonance(SCORE, "webgpu", {
    gesture: "ripple",
    colors: [0x9fb8b0, 0xd9c7a9, 0xd8a391],
    timbre: { partialRatio: 1, partialGain: 0, chirpRatio: 0 },
    locate(_voice, time, target) {
      locatedAt.push(time);
      target.set(1, 2, 3);
    },
  });
  const strokes = resonance.group.children.find(
    (child): child is THREE.LineSegments => (child as THREE.LineSegments).isLineSegments,
  )!;
  const core = resonance.group.getObjectByName("finite-envelope-cores") as THREE.InstancedMesh;
  const points = resonance.group.children.find(
    (child): child is THREE.Points =>
      child instanceof THREE.Points && child.geometry.getAttribute("color") !== undefined,
  )!;

  return { resonance, locatedAt, strokes, core, points };
}

function coreScale(core: THREE.InstancedMesh): number {
  const matrix = new THREE.Matrix4().fromArray(core.instanceMatrix.array, 0);
  return matrix.elements[0]!;
}

describe("createEventResonance reduced motion", () => {
  it("keeps one voice's decorative shape still while absolute position and finite brightness continue", () => {
    const { resonance, locatedAt, strokes, core, points } = createFixture();

    const firstFrame = resonance.update(0.2, true);
    const firstVoice = {
      count: firstFrame.count,
      age: firstFrame.voices[0]!.ageSeconds,
      envelope: firstFrame.voices[0]!.envelope,
    };
    const firstStrokePositions = strokes.geometry.getAttribute("position").array.slice();
    const firstCorePosition = points.geometry.getAttribute("position").array.slice();
    const firstCoreColor = points.geometry.getAttribute("color").array.slice(0, 3);
    const firstCoreSize = coreScale(core);

    const secondFrame = resonance.update(0.8, true);
    const secondVoice = {
      count: secondFrame.count,
      age: secondFrame.voices[0]!.ageSeconds,
      envelope: secondFrame.voices[0]!.envelope,
    };
    const secondStrokePositions = strokes.geometry.getAttribute("position").array.slice();
    const secondCorePosition = points.geometry.getAttribute("position").array.slice();
    const secondCoreColor = points.geometry.getAttribute("color").array.slice(0, 3);
    const secondCoreSize = coreScale(core);

    expect(firstVoice.count).toBe(1);
    expect(secondVoice.count).toBe(1);
    expect(firstVoice.age).toBe(0.2);
    expect(secondVoice.age).toBe(0.8);
    expect(firstVoice.envelope).toBeGreaterThan(0);
    expect(secondVoice.envelope).toBeGreaterThan(0);
    expect(locatedAt).toEqual([0.2, 0.8]);
    expect(secondStrokePositions).toEqual(firstStrokePositions);
    expect(secondCorePosition).toEqual(firstCorePosition);
    expect(secondCoreSize).toBe(firstCoreSize);
    expect(secondCoreColor).not.toEqual(firstCoreColor);
  });

  it("keeps the local decoration moving normally and removes voices after the finite envelope", () => {
    const normal = createFixture();
    const normalFirst = normal.resonance.update(0.2, false);
    const firstStrokePositions = normal.strokes.geometry.getAttribute("position").array.slice();
    const firstCoreSize = coreScale(normal.core);
    const normalSecond = normal.resonance.update(0.8, false);
    const secondStrokePositions = normal.strokes.geometry.getAttribute("position").array.slice();
    const secondCoreSize = coreScale(normal.core);

    expect(normalFirst.count).toBe(1);
    expect(normalSecond.count).toBe(1);
    expect(secondStrokePositions).not.toEqual(firstStrokePositions);
    expect(secondCoreSize).not.toBe(firstCoreSize);

    for (const reducedMotion of [false, true]) {
      const { resonance, strokes, core } = createFixture();
      const frame = resonance.update(1.6, reducedMotion);

      expect(frame.count).toBe(0);
      expect(strokes.geometry.drawRange.count).toBe(0);
      expect(core.count).toBe(0);
    }
  });
});
