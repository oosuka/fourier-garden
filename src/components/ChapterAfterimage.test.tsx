import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChapterAfterimage } from "./ChapterAfterimage";

afterEach(() => vi.unstubAllGlobals());

describe("chapter afterimage ownership", () => {
  it("keeps the captured pixels through a StrictMode remount and frees them only after release", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    let frame: FrameRequestCallback;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const image = document.createElement("canvas");
    image.width = 200;
    image.height = 100;
    let level = 1;
    const state = {
      echo: {
        image,
        width: 1200,
        height: 600,
        left: 0,
        top: 0,
        dispose: () => {
          image.width = 0;
          image.height = 0;
        },
      },
      level: () => level,
    };
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <StrictMode>
          <ChapterAfterimage state={state} />
        </StrictMode>,
      ),
    );
    expect(container.querySelector("canvas")?.width).toBe(200);
    expect(container.querySelector("canvas")?.height).toBe(100);
    level = 0.5;
    await act(async () => frame!(16));
    expect(container.querySelector<HTMLDivElement>(".chapterAfterimage")?.style.opacity).toBe(
      "0.5",
    );
    expect(image.width).toBe(200);
    level = 0;
    await act(async () => frame!(32));
    expect(image.width).toBe(0);
    await act(async () => root.unmount());
  });
});
