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

  it("uses explicit button types for close and tab controls", () => {
    const pattern = patternRegistry[0]!;
    const audio = new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume);
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      <DetailsPanel open pattern={pattern} audio={audio} onClose={vi.fn<() => void>()} />,
    );
    const panelButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".detailsPanel button"),
    );

    expect(panelButtons.length).toBeGreaterThan(0);
    expect(panelButtons.every((button) => button.type === "button")).toBe(true);
  });

  it("preserves the selected explanation mode when the chapter changes", async () => {
    const firstPattern = {
      ...patternRegistry[0]!,
      MathematicalDetails: () => <div>first-chapter-math</div>,
    };
    const nextPattern = {
      ...patternRegistry[1]!,
      MathematicalDetails: () => <div>next-chapter-math</div>,
    };
    const firstAudio = new AudioEngine(
      firstPattern.audio.createProgram(),
      firstPattern.audio.initialVolume,
    );
    const nextAudio = new AudioEngine(
      nextPattern.audio.createProgram(),
      nextPattern.audio.initialVolume,
    );
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <DetailsPanel
          open
          pattern={firstPattern}
          audio={firstAudio}
          onClose={vi.fn<() => void>()}
        />,
      );
    });
    const mathematicalTab = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "数学の詳細",
    );
    await act(async () => mathematicalTab?.click());
    await act(async () => {
      root.render(
        <DetailsPanel open pattern={nextPattern} audio={nextAudio} onClose={vi.fn<() => void>()} />,
      );
    });

    expect(mathematicalTab?.getAttribute("aria-selected")).toBe("true");
    expect(container.textContent).toContain("next-chapter-math");

    await act(async () => root.unmount());
    getContext.mockRestore();
  });

  it("shows the finite-model and sound-shape contract in mathematical reading mode", async () => {
    const pattern = patternRegistry[0]!;
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

    expect(container.textContent).toContain("FINITE MODEL");
    expect(container.textContent).toContain("ABSOLUTE TIME");
    expect(container.textContent).toContain("LOCAL MAPPING");

    await act(async () => root.unmount());
    getContext.mockRestore();
  });
});
