import { Profiler, act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Transport } from "../core/transport";
import { patternRegistry } from "../patterns/registry";
import { ControlBar } from "./ControlBar";

function renderControlBar(patternIndex: number, chapterCount: number, switching = false) {
  return renderToStaticMarkup(
    <ControlBar
      playing={false}
      volume={0.35}
      detailsOpen={false}
      fullscreen={false}
      pattern={patternRegistry[patternIndex]!}
      chapterCount={chapterCount}
      chapterIndex={patternIndex}
      switchingChapter={switching}
      transport={new Transport(() => 0)}
      onTogglePlay={vi.fn<() => void>()}
      onVolume={vi.fn<(value: number) => void>()}
      onPreviousChapter={vi.fn<() => void>()}
      onNextChapter={vi.fn<() => void>()}
      onToggleDetails={vi.fn<() => void>()}
      onToggleFullscreen={vi.fn<() => void>()}
    />,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ControlBar chapter navigation", () => {
  it("does not show chapter navigation for the published single-chapter registry", () => {
    const container = document.createElement("div");
    container.innerHTML = renderControlBar(0, 1);

    expect(container.querySelector("[aria-label='前の章']")).toBeNull();
    expect(container.querySelector("[aria-label='次の章']")).toBeNull();
  });

  it("shows bounded navigation without a preview label for published Spectral Cathedral", () => {
    const container = document.createElement("div");
    container.innerHTML = renderControlBar(1, 2);

    expect(container.querySelector<HTMLButtonElement>("[aria-label='前の章']")?.disabled).toBe(
      false,
    );
    expect(container.querySelector<HTMLButtonElement>("[aria-label='次の章']")?.disabled).toBe(
      true,
    );
    expect(container.textContent).not.toContain("PREVIEW");
    expect(container.textContent).toContain("Spectral Cathedral");
  });

  it("shows published Möbius Choir without a preview label", () => {
    const container = document.createElement("div");
    container.innerHTML = renderControlBar(2, 3);

    expect(container.querySelector<HTMLButtonElement>("[aria-label='前の章']")?.disabled).toBe(
      false,
    );
    expect(container.querySelector<HTMLButtonElement>("[aria-label='次の章']")?.disabled).toBe(
      true,
    );
    expect(container.textContent).not.toContain("PREVIEW");
    expect(container.textContent).toContain("Möbius Choir");
  });

  it("disables both directions while switching chapters", () => {
    const container = document.createElement("div");
    container.innerHTML = renderControlBar(0, 2, true);

    expect(container.querySelector<HTMLButtonElement>("[aria-label='前の章']")?.disabled).toBe(
      true,
    );
    expect(container.querySelector<HTMLButtonElement>("[aria-label='次の章']")?.disabled).toBe(
      true,
    );
  });

  it("exposes explicit button semantics and keyboard shortcuts for core controls", () => {
    const container = document.createElement("div");
    container.innerHTML = renderControlBar(0, 3);

    expect(container.querySelector<HTMLButtonElement>(".primaryControl")?.type).toBe("button");
    expect(container.querySelector(".primaryControl")?.getAttribute("aria-keyshortcuts")).toBe(
      "Space",
    );
    expect(container.querySelector(".primaryControl")?.getAttribute("aria-label")).toBe(
      "再生 (Space)",
    );

    const details = container.querySelector<HTMLButtonElement>(
      "button[aria-label='詳細パネルを開く (D)']",
    );
    expect(details?.type).toBe("button");
    expect(details?.getAttribute("aria-keyshortcuts")).toBe("D");

    const fullscreen = container.querySelector<HTMLButtonElement>(
      "button[aria-label='全画面表示 (F)']",
    );
    expect(fullscreen?.type).toBe("button");
    expect(fullscreen?.getAttribute("aria-keyshortcuts")).toBe("F");
  });

  it("only rerenders the clock when the displayed whole second changes", async () => {
    let clockSeconds = 0;
    let frameCallback: FrameRequestCallback | null = null;
    let frameId = 0;
    let renderCount = 0;
    const transport = new Transport(() => clockSeconds);
    transport.play();
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn<(callback: FrameRequestCallback) => number>((callback) => {
        frameCallback = callback;
        frameId += 1;
        return frameId;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn<(handle: number) => void>());
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <Profiler
          id="control-bar-clock"
          onRender={() => {
            renderCount += 1;
          }}
        >
          <ControlBar
            playing
            volume={0.35}
            detailsOpen={false}
            fullscreen={false}
            pattern={patternRegistry[0]!}
            chapterCount={3}
            chapterIndex={0}
            switchingChapter={false}
            transport={transport}
            onTogglePlay={vi.fn<() => void>()}
            onVolume={vi.fn<(value: number) => void>()}
            onPreviousChapter={vi.fn<() => void>()}
            onNextChapter={vi.fn<() => void>()}
            onToggleDetails={vi.fn<() => void>()}
            onToggleFullscreen={vi.fn<() => void>()}
          />
        </Profiler>,
      );
    });
    const initialRenderCount = renderCount;

    clockSeconds = 0.25;
    await act(async () => {
      frameCallback?.(250);
    });
    expect(renderCount).toBe(initialRenderCount);

    clockSeconds = 1.01;
    await act(async () => {
      frameCallback?.(1_010);
    });
    expect(renderCount).toBe(initialRenderCount + 1);
    expect(container.querySelector(".timeDisplay span")?.textContent).toBe("00:01");

    await act(async () => root.unmount());
  });
});
