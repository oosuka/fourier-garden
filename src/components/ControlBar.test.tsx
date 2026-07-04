import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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
});
