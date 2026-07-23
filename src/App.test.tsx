import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { App } from "./App";
import { getPatternRegistry } from "./patterns/registry";

describe("App entry gate", () => {
  it("keeps playback controls out of the tab order before entering", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(<App />);
    const playbackControl = container.querySelector(".primaryControl");

    expect(playbackControl === null || playbackControl.closest("[inert]") !== null).toBe(true);
  });

  it("exposes all ten formal chapters from the default and legacy preview URLs", () => {
    expect(getPatternRegistry("").map((pattern) => pattern.id)).toEqual([
      "residue-bloom",
      "spectral-cathedral",
      "prime-constellation",
      "mobius-choir",
      "bessel-tide",
      "lissajous-orchard",
      "dirichlet-lanterns",
      "wavelet-rain",
      "riemann-veil",
      "phase-torus",
    ]);
    expect(getPatternRegistry("?chapters=preview").map((pattern) => pattern.id)).toEqual([
      "residue-bloom",
      "spectral-cathedral",
      "prime-constellation",
      "mobius-choir",
      "bessel-tide",
      "lissajous-orchard",
      "dirichlet-lanterns",
      "wavelet-rain",
      "riemann-veil",
      "phase-torus",
    ]);
  });
});
