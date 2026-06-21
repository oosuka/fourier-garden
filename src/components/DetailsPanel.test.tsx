import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AudioEngine } from "../audio/AudioEngine";
import { patternRegistry } from "../patterns/registry";
import { DetailsPanel } from "./DetailsPanel";

describe("DetailsPanel visibility", () => {
  it("renders mathematical details supplied by the chapter definition", async () => {
    const pattern = {
      ...patternRegistry[0]!,
      MathematicalDetails: () => <div>chapter-owned-details</div>,
    };
    const audio = new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume);
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <DetailsPanel open pattern={pattern} audio={audio} onClose={vi.fn<() => void>()} />,
      );
    });
    const mathematicalTab = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "数学の詳細",
    );
    await act(async () => mathematicalTab?.click());

    expect(container.innerHTML).toContain("chapter-owned-details");
    await act(async () => root.unmount());
    getContext.mockRestore();
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
});
