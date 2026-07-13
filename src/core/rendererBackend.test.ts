import { describe, expect, it } from "vitest";

import { selectRendererBackend } from "./rendererBackend";

describe("selectRendererBackend", () => {
  it("uses the classic WebGL renderer when fallback is forced", () => {
    expect(selectRendererBackend(true, true)).toBe("webgl");
  });

  it("uses the classic WebGL renderer when WebGPU is unavailable", () => {
    expect(selectRendererBackend(false, false)).toBe("webgl");
  });

  it("uses WebGPU when it is supported and not overridden", () => {
    expect(selectRendererBackend(false, true)).toBe("webgpu");
  });
});
