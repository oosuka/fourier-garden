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

  it("exposes Chapter 2 without a preview query", () => {
    expect(getPatternRegistry("").map((pattern) => pattern.id)).toEqual([
      "residue-bloom",
      "spectral-cathedral",
    ]);
    expect(getPatternRegistry("?chapters=preview").map((pattern) => pattern.id)).toEqual([
      "residue-bloom",
      "spectral-cathedral",
    ]);
  });
});
