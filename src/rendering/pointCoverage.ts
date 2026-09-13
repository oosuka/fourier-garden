// Native WebGPU points occupy one physical pixel. The smallest WebGL points
// also clamp to one pixel. A half-CSS-pixel dust grain therefore covers DPR²/4
// of that pixel. CanvasStage caps DPR at 2; retain the same energy at that cap.
export function getSubpixelPointCoverage(pixelRatio: number): number {
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0)
    throw new RangeError("Point pixel ratio must be finite and positive");
  return Math.min(1, (pixelRatio * 0.5) ** 2);
}
