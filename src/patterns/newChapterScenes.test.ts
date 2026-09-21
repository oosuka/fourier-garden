import * as THREE from "three/webgpu";
import { describe, expect, it } from "vitest";

import { createBesselTideContent } from "./bessel-tide/scene/scene";
import { createDirichletLanternsContent } from "./dirichlet-lanterns/scene/scene";
import { createLissajousOrchardContent } from "./lissajous-orchard/scene/scene";
import { createPhaseTorusContent } from "./phase-torus/scene/scene";
import { createPrimeConstellationContent } from "./prime-constellation/scene/scene";
import { createRiemannVeilContent } from "./riemann-veil/scene/scene";
import { WAVELET_RAIN_SCORE } from "./wavelet-rain/audio/score";
import { createWaveletRainContent, getWaveletRainVisualEvent } from "./wavelet-rain/scene/scene";

function getRelativeStrokePositions(strokes: THREE.LineSegments, anchors: Float32Array): number[] {
  const positions = strokes.geometry.getAttribute("position").array as Float32Array;
  const activeVertexCount = strokes.geometry.drawRange.count;
  const positionsPerVoice = 32 * 2 * 3;
  return Array.from({ length: activeVertexCount * 3 }, (_, offset) => {
    const voiceIndex = Math.floor(offset / positionsPerVoice);
    const axis = offset % 3;
    return positions[offset]! - anchors[voiceIndex * 3 + axis]!;
  });
}

function getPositions(object: THREE.Object3D): Float32Array {
  const geometry = (object as THREE.Line).geometry;
  return geometry.getAttribute("position").array as Float32Array;
}

function getSurface(group: THREE.Group): THREE.Object3D {
  return group.children.find((object) => (object as THREE.Mesh).isMesh)!;
}

function getMotionSignature(group: THREE.Group): number[] {
  const focus = group.children[0];
  return [
    group.position.x,
    group.position.y,
    group.position.z,
    group.rotation.x,
    group.rotation.y,
    group.rotation.z,
    focus?.position.x ?? 0,
    focus?.position.y ?? 0,
    focus?.position.z ?? 0,
    focus?.rotation.x ?? 0,
    focus?.rotation.y ?? 0,
    focus?.rotation.z ?? 0,
    focus?.scale.x ?? 1,
    focus?.scale.y ?? 1,
    focus?.scale.z ?? 1,
  ];
}

describe("new chapter scene continuity", () => {
  it.each([
    ["Prime", createPrimeConstellationContent, 3],
    ["Lissajous", createLissajousOrchardContent, 9],
    ["Dirichlet", createDirichletLanternsContent, 6],
    ["Haar", createWaveletRainContent, 66],
    ["Riemann", createRiemannVeilContent, 5],
    ["Torus", createPhaseTorusContent, 5],
  ])(
    "shows only the mathematical objects in the %s comparison view",
    (_, createContent, expected) => {
      const content = createContent("webgpu", false);
      content.update(17.25);
      let visibleObjects = 0;
      content.group.traverseVisible((object) => {
        if ((object as THREE.Mesh).geometry) visibleObjects++;
      });
      expect(visibleObjects).toBe(expected);
    },
  );

  it.each([
    ["Prime", createPrimeConstellationContent],
    ["Bessel", createBesselTideContent],
    ["Lissajous", createLissajousOrchardContent],
    ["Dirichlet", createDirichletLanternsContent],
    ["Haar", createWaveletRainContent],
    ["Riemann", createRiemannVeilContent],
    ["Torus", createPhaseTorusContent],
  ])("holds the %s staging still with reduced motion", (_, createContent) => {
    const content = createContent();
    content.update(0, true);
    content.group.updateMatrix();
    const before = content.group.matrix.toArray();
    content.update(18, true);
    content.group.updateMatrix();
    expect(content.group.matrix.toArray()).toEqual(before);
  });

  it.each([
    ["Prime", createPrimeConstellationContent],
    ["Bessel", createBesselTideContent],
    ["Lissajous", createLissajousOrchardContent],
    ["Dirichlet", createDirichletLanternsContent],
    ["Haar", createWaveletRainContent],
    ["Riemann", createRiemannVeilContent],
    ["Torus", createPhaseTorusContent],
  ])(
    "limits only the %s shared event decoration under reduced motion",
    (_chapter, createContent) => {
      const normal = createContent();
      const reduced = createContent();
      normal.update(0.12, false);
      reduced.update(0.12, true);

      const normalLayer = normal.group.getObjectByName("event-resonance") as THREE.Group;
      const reducedLayer = reduced.group.getObjectByName("event-resonance") as THREE.Group;
      const normalStrokes = normalLayer.children.find(
        (child) => (child as THREE.LineSegments).isLineSegments,
      ) as THREE.LineSegments;
      const reducedStrokes = reducedLayer.children.find(
        (child) => (child as THREE.LineSegments).isLineSegments,
      ) as THREE.LineSegments;
      const normalCore = normalLayer.getObjectByName(
        "finite-envelope-cores",
      ) as THREE.InstancedMesh;
      const reducedCore = reducedLayer.getObjectByName(
        "finite-envelope-cores",
      ) as THREE.InstancedMesh;
      const normalCorePoints = normalLayer.children
        .filter((child) => child instanceof THREE.Points)
        .find((child) => child.geometry.getAttribute("color") !== undefined)!;
      const reducedCorePoints = reducedLayer.children
        .filter((child) => child instanceof THREE.Points)
        .find((child) => child.geometry.getAttribute("color") !== undefined)!;
      const normalCorePositions = normalCorePoints.geometry.getAttribute("position").array;
      const reducedCorePositions = reducedCorePoints.geometry.getAttribute("position").array;
      expect(reducedStrokes.geometry.drawRange.count).toBeGreaterThan(0);
      expect(getRelativeStrokePositions(reducedStrokes, reducedCorePositions)).not.toEqual(
        getRelativeStrokePositions(normalStrokes, normalCorePositions as Float32Array),
      );
      expect(reducedCore.instanceMatrix.array.slice(0, 16)).not.toEqual(
        normalCore.instanceMatrix.array.slice(0, 16),
      );
    },
  );

  it("preserves the Bessel field while removing camera staging and decorative layers", () => {
    const normal = createBesselTideContent();
    const reduced = createBesselTideContent("webgpu", false);
    normal.update(17.25);
    reduced.update(17.25, true);
    expect(getPositions(getSurface(reduced.group))).toEqual(getPositions(getSurface(normal.group)));
  });

  it("keeps the exact Bessel surface finite while adding visible depth layers", () => {
    const content = createBesselTideContent();
    content.update(0);
    const surface = content.group.children.find((child) => (child as THREE.Mesh).isMesh) as
      | THREE.Mesh
      | undefined;
    const positions = surface?.geometry.getAttribute("position").array as Float32Array | undefined;

    expect(content.group.children.length).toBeGreaterThan(10);
    expect(positions?.every(Number.isFinite)).toBe(true);
    const before = positions?.slice();
    content.update(18);
    expect(positions?.some((value, index) => Math.abs(value - before![index]!) > 1e-4)).toBe(true);
  });

  it("keeps all 25 prime support points while layering constellation echoes", () => {
    const content = createPrimeConstellationContent();
    content.update(12.5);
    const pointClouds = content.group.children.filter(
      (child) => (child as THREE.Points).isPoints,
    ) as THREE.Points[];
    const support = pointClouds.find(
      (points) => points.geometry.getAttribute("position").count === 25,
    );

    expect(content.group.children.length).toBeGreaterThan(10);
    expect(support?.geometry.getAttribute("position").count).toBe(25);
  });

  it("keeps Wavelet Rain cells fixed when transport time is paused", () => {
    const content = createWaveletRainContent();
    content.update(17.25);
    const first = content.group.children.slice(0, 63).map((cell) => cell.position.y);
    for (let frame = 0; frame < 240; frame += 1) content.update(17.25);
    const repeated = content.group.children.slice(0, 63).map((cell) => cell.position.y);

    expect(repeated).toEqual(first);
  });

  it("maps each Wavelet Rain onset to the same coefficient in sound and local rain", () => {
    for (const event of WAVELET_RAIN_SCORE.events.filter((_, index) => index % 29 === 0)) {
      const visual = getWaveletRainVisualEvent(event.timeSeconds + 0.02);

      expect(visual.eventIndex).toBe(event.sourceIndex);
      expect(visual.coefficientIndex).toBe(event.sourceIndex % 63);
      expect(visual.pulse).toBeGreaterThan(0);
      expect(visual.pulse).toBeLessThanOrEqual(1);
    }
  });

  it("keeps exact Wavelet cells separate from coefficient-linked poetic droplets", () => {
    const content = createWaveletRainContent();
    const droplets = content.group.children.filter(
      (child) => child.userData.layer === "poetic-coefficient-drop",
    );

    expect(droplets).toHaveLength(63);
  });

  it("crossfades the Lissajous hero layout across selection boundaries", () => {
    const content = createLissajousOrchardContent();
    const boundary = 60 / 9;
    content.update(boundary - 1 / 60);
    const before: number[] = [];
    for (const line of content.group.children)
      if ((line as THREE.Line).isLine) before.push(...getPositions(line));
    content.update(boundary + 1 / 60);
    const after: number[] = [];
    for (const line of content.group.children)
      if ((line as THREE.Line).isLine) after.push(...getPositions(line));
    const maximumJump = Math.max(...after.map((value, index) => Math.abs(value - before[index]!)));

    expect(maximumJump).toBeLessThan(0.12);
  });

  it("renders distinct partial-sum and Fejer comparison curves", () => {
    const content = createDirichletLanternsContent();
    content.update(40);
    const partial = getPositions(content.group.getObjectByName("dirichlet-partial")!);
    const fejer = getPositions(content.group.getObjectByName("dirichlet-fejer")!);

    expect(partial.some((value, index) => Math.abs(value - fejer[index]!) > 1e-4)).toBe(true);
  });

  it("builds Riemann veil echoes from the same finite partial-sum geometries", () => {
    const content = createRiemannVeilContent();
    content.update(28);

    expect(content.group.children.length).toBeGreaterThan(20);
    const positionArrays = content.group.children
      .filter((child) => (child as THREE.Line).isLine)
      .map((child) => getPositions(child));
    expect(positionArrays.every((positions) => positions.every(Number.isFinite))).toBe(true);
  });

  it("separates the exact phase torus from its displaced poetic membrane", () => {
    const content = createPhaseTorusContent();
    content.update(9);
    const torus = content.group.children.find(
      (child) => (child as THREE.Mesh).isMesh,
    ) as THREE.Mesh;
    const exact = torus.geometry.getAttribute("position").array as Float32Array;
    const poetic = (torus.children[0] as THREE.Mesh).geometry.getAttribute("position")
      .array as Float32Array;

    expect(torus.children.length).toBeGreaterThanOrEqual(6);
    expect(poetic.some((value, index) => Math.abs(value - exact[index]!) > 1e-4)).toBe(true);
  });

  it.each([
    ["Prime Constellation", createPrimeConstellationContent],
    ["Bessel Tide", createBesselTideContent],
    ["Lissajous Orchard", createLissajousOrchardContent],
    ["Dirichlet Lanterns", createDirichletLanternsContent],
    ["Wavelet Rain", createWaveletRainContent],
    ["Riemann Veil", createRiemannVeilContent],
    ["Phase Torus", createPhaseTorusContent],
  ])("keeps %s staging in continuous absolute-time motion", (_, createContent) => {
    const content = createContent();
    content.update(0);
    const before = getMotionSignature(content.group);
    content.update(18);
    const after = getMotionSignature(content.group);

    expect(after.some((value, index) => Math.abs(value - before[index]!) > 1e-4)).toBe(true);
  });
});
