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
});
