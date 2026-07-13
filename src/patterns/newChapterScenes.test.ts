import type * as THREE from "three";
import { describe, expect, it } from "vitest";

import { createDirichletLanternsContent } from "./dirichlet-lanterns/scene/scene";
import { createLissajousOrchardContent } from "./lissajous-orchard/scene/scene";
import { createWaveletRainContent } from "./wavelet-rain/scene/scene";

function getPositions(object: THREE.Object3D): Float32Array {
  const geometry = (object as THREE.Line).geometry;
  return geometry.getAttribute("position").array as Float32Array;
}

describe("new chapter scene continuity", () => {
  it("keeps Wavelet Rain cells fixed when transport time is paused", () => {
    const content = createWaveletRainContent();
    content.update(17.25);
    const first = content.group.children.slice(0, 63).map((cell) => cell.position.y);
    for (let frame = 0; frame < 240; frame += 1) content.update(17.25);
    const repeated = content.group.children.slice(0, 63).map((cell) => cell.position.y);

    expect(repeated).toEqual(first);
  });

  it("crossfades the Lissajous hero layout across selection boundaries", () => {
    const content = createLissajousOrchardContent();
    const boundary = 60 / 9;
    content.update(boundary - 1 / 60);
    const before: number[] = [];
    for (const line of content.group.children) before.push(...getPositions(line));
    content.update(boundary + 1 / 60);
    const after: number[] = [];
    for (const line of content.group.children) after.push(...getPositions(line));
    const maximumJump = Math.max(...after.map((value, index) => Math.abs(value - before[index]!)));

    expect(maximumJump).toBeLessThan(0.12);
  });

  it("renders distinct partial-sum and Fejer comparison curves", () => {
    const content = createDirichletLanternsContent();
    content.update(40);
    const partial = getPositions(content.group.children.at(-2)!);
    const fejer = getPositions(content.group.children.at(-1)!);

    expect(partial.some((value, index) => Math.abs(value - fejer[index]!) > 1e-4)).toBe(true);
  });
});
