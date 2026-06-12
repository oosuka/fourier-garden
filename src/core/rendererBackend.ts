export type RendererBackend = "webgpu" | "webgl";

export function selectRendererBackend(
  forceWebGL: boolean,
  supportsWebGPU: boolean,
): RendererBackend {
  return forceWebGL || !supportsWebGPU ? "webgl" : "webgpu";
}
