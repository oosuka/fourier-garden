import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AudioEngine } from "../audio/AudioEngine";
import { patternRegistry } from "../patterns/registry";
import { DetailsPanel } from "./DetailsPanel";

beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterEach(() => vi.unstubAllGlobals());

describe("DetailsPanel visibility", () => {
  it.each(["tab", "chapter"] as const)(
    "starts a new explanation at the top after %s navigation",
    async (navigation) => {
      const pattern = patternRegistry[0]!;
      const audio = new AudioEngine(pattern.audio.createProgram());
      const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      const container = document.createElement("div");
      const root = createRoot(container);
      const render = (selected = pattern) =>
        root.render(<DetailsPanel open pattern={selected} audio={audio} onClose={() => {}} />);
      await act(async () => render());
      const content = container.querySelector<HTMLElement>("#notes-content");
      if (!content) throw new Error("Missing explanation panel");
      content.scrollTop = 580;
      await act(async () => render());
      expect(content.scrollTop, "ordinary rendering keeps the reader's position").toBe(580);

      if (navigation === "tab") {
        await act(async () =>
          container.querySelector<HTMLButtonElement>("#notes-tab-mathematical")?.click(),
        );
      } else {
        await act(async () => render(patternRegistry[1]!));
      }
      expect(container.querySelector<HTMLElement>("#notes-content")?.scrollTop).toBe(0);
      await act(async () => root.unmount());
      getContext.mockRestore();
    },
  );

  it("retains each chapter's experiment through note and chapter navigation", async () => {
    const lissajous = patternRegistry.find((pattern) => pattern.id === "lissajous-orchard")!;
    const haar = patternRegistry.find((pattern) => pattern.id === "wavelet-rain")!;
    const audio = new AudioEngine(lissajous.audio.createProgram());
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () =>
      root.render(<DetailsPanel open pattern={lissajous} audio={audio} onClose={() => {}} />),
    );
    const slider = container.querySelector<HTMLInputElement>(
      ".mathematicalStudy input[type=range]",
    );
    expect(slider, "the observation note offers a phase experiment").not.toBeNull();
    if (!slider) throw new Error("Missing study control");
    const before = container.querySelector(".studyCurve--focus")?.getAttribute("d");
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(slider, "0");
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(slider.getAttribute("aria-valuetext")).toBe("δ = 0.000π");
    expect(container.querySelector(".studyCurve--focus")?.getAttribute("d")).not.toBe(before);
    expect(audio.initialized).toBe(false);
    const changedCurve = container.querySelector(".studyCurve--focus")?.getAttribute("d");
    await act(async () =>
      root.render(
        <DetailsPanel open={false} pattern={lissajous} audio={audio} onClose={() => {}} />,
      ),
    );
    expect(container.querySelector(".mathematicalStudy")).toBeNull();
    await act(async () =>
      root.render(<DetailsPanel open pattern={lissajous} audio={audio} onClose={() => {}} />),
    );
    expect(container.querySelector<HTMLInputElement>(".mathematicalStudy input")?.value).toBe("0");
    expect(container.querySelector(".studyCurve--focus")?.getAttribute("d")).toBe(changedCurve);
    await act(async () =>
      container.querySelector<HTMLButtonElement>("#notes-tab-mathematical")?.click(),
    );
    await act(async () => container.querySelector<HTMLButtonElement>("#notes-tab-gentle")?.click());
    expect(container.querySelector<HTMLInputElement>(".mathematicalStudy input")?.value).toBe("0");
    await act(async () =>
      root.render(<DetailsPanel open pattern={haar} audio={audio} onClose={() => {}} />),
    );
    const nextSlider = container.querySelector<HTMLInputElement>(
      ".mathematicalStudy input[type=range]",
    )!;
    expect(nextSlider.max).toBe("6");
    expect(nextSlider.value).toBe("3");
    expect(nextSlider.getAttribute("aria-valuetext")).toBe("J = 3 · 8 区間");
    await act(async () =>
      root.render(<DetailsPanel open pattern={lissajous} audio={audio} onClose={() => {}} />),
    );
    expect(container.querySelector<HTMLInputElement>(".mathematicalStudy input")?.value).toBe("0");
    expect(container.querySelector(".studyCurve--focus")?.getAttribute("d")).toBe(changedCurve);
    await act(async () =>
      container.querySelector<HTMLButtonElement>(".studyFootnote button")?.click(),
    );
    expect(container.querySelector<HTMLInputElement>(".mathematicalStudy input")?.value).toBe("12");
    expect(container.querySelector(".studyCurve--focus")?.getAttribute("d")).toBe(before);
    await act(async () => root.unmount());
    getContext.mockRestore();
  });

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

  it("shows the actual finite model and local mapping in mathematical reading mode", async () => {
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

    expect(container.textContent).toContain("有限フーリエ級数");
    expect(container.textContent).toContain(
      "144秒の音楽形式が反復しても数学時刻はリセットしません",
    );
    expect(container.textContent).toContain("絶対イベント時刻");

    await act(async () => root.unmount());
    getContext.mockRestore();
  });
});
