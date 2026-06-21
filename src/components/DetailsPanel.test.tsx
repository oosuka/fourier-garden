import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AudioEngine } from "../audio/AudioEngine";
import { patternPreviewRegistry, patternRegistry } from "../patterns/registry";
import { DetailsPanel } from "./DetailsPanel";
import { SpectralCathedralDetails } from "./SpectralCathedralDetails";

const applicationStyles = readFileSync("src/styles.css", "utf8");

describe("DetailsPanel visibility", () => {
  it("fits the long Möbius Choir equations inside the desktop detail panel", () => {
    expect(applicationStyles).toContain(".app--mobius-choir .detailsPanel .detailsFormula .katex");
    expect(applicationStyles).toContain(".app--mobius-choir .detailsPanel .mathIdentity .katex");
  });

  it("removes closed panel controls from interaction and the accessibility tree", () => {
    const pattern = patternRegistry[0]!;
    const audio = new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume);
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      <DetailsPanel open={false} pattern={pattern} audio={audio} onClose={vi.fn<() => void>()} />,
    );
    const panel = container.querySelector(".detailsPanel");

    expect(panel?.hasAttribute("inert")).toBe(true);
    expect(panel?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders the Spectral Cathedral eigenvalue analysis without calling it a Hz spectrum", () => {
    const pattern = patternPreviewRegistry[1];
    if (pattern?.kind !== "spectral-cathedral") {
      throw new Error("Spectral Cathedral preview is missing");
    }
    const audio = new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume);
    const panelMarkup = renderToStaticMarkup(
      <DetailsPanel open pattern={pattern} audio={audio} onClose={vi.fn<() => void>()} />,
    );
    const mathematicalMarkup = renderToStaticMarkup(<SpectralCathedralDetails pattern={pattern} />);

    expect(mathematicalMarkup).toContain("固有値 λ");
    expect(mathematicalMarkup).toContain("相対エネルギー指標");
    expect(mathematicalMarkup).toContain("12モード");
    expect(mathematicalMarkup).toContain("75秒・18小節・5幕");
    expect(panelMarkup).toContain("局所的な光柱とアーチ伝播");
    expect(panelMarkup).not.toContain("10小節");
    expect(panelMarkup).toContain("Hzスペクトル、DFT、FFT");
  });
});
