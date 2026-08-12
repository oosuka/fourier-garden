import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { getPatternRegistry } from "./patterns/registry";

const audioMockState = vi.hoisted(() => ({
  instances: [] as Array<{
    currentTime: number;
    currentVolume: number;
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    fadeOutAndDispose: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("./audio/AudioEngine", () => ({
  AudioEngine: class {
    currentTime = 0;
    currentVolume: number;
    play = vi.fn<() => Promise<void>>(async () => {});
    pause = vi.fn<() => void>();
    fadeOutAndDispose = vi.fn<() => Promise<void>>(async () => {});
    setVolume = vi.fn<(value: number) => void>((value) => {
      this.currentVolume = value;
    });
    dispose = vi.fn<() => Promise<void>>(async () => {});

    constructor(_program: unknown, initialVolume: number) {
      this.currentVolume = initialVolume;
      audioMockState.instances.push(this);
    }
  },
}));

vi.mock("./components/CanvasStage", () => ({
  CanvasStage: ({
    pattern,
    onStatus,
  }: {
    pattern: { id: string };
    onStatus: (status: "ready") => void;
  }) => {
    useEffect(() => onStatus("ready"), [onStatus, pattern.id]);
    return <canvas data-testid={`scene-${pattern.id}`} />;
  },
}));

vi.mock("./components/DetailsPanel", () => ({
  DetailsPanel: ({ open }: { open: boolean }) => <aside data-open={String(open)} />,
}));

interface MountedApp {
  container: HTMLDivElement;
  root: Root;
}

async function mountApp(): Promise<MountedApp> {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<App />));
  return { container, root };
}

async function click(container: ParentNode, selector: string): Promise<void> {
  const target = container.querySelector<HTMLButtonElement>(selector);
  if (!target) throw new Error(`Missing test control: ${selector}`);
  await act(async () => target.click());
}

async function unmountApp({ container, root }: MountedApp): Promise<void> {
  await act(async () => root.unmount());
  await act(async () => Promise.resolve());
  container.remove();
}

beforeEach(() => {
  audioMockState.instances.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("App entry gate", () => {
  it("keeps playback controls out of the tab order before entering", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(<App />);
    const playbackControl = container.querySelector(".primaryControl");

    expect(playbackControl === null || playbackControl.closest("[inert]") !== null).toBe(true);
  });

  it("starts and pauses the same audio engine after entering", async () => {
    const mounted = await mountApp();
    const firstAudio = audioMockState.instances[0]!;

    await click(mounted.container, ".enterButton");
    expect(firstAudio.play).toHaveBeenCalledWith(0);
    expect(mounted.container.querySelector(".primaryControl")).not.toBeNull();

    await click(mounted.container, ".primaryControl");
    expect(firstAudio.pause).toHaveBeenCalledTimes(1);

    await unmountApp(mounted);
    expect(firstAudio.dispose).toHaveBeenCalledTimes(1);
  });

  it("preserves playback across a timed chapter transition", async () => {
    vi.useFakeTimers();
    const mounted = await mountApp();
    const firstAudio = audioMockState.instances[0]!;

    await click(mounted.container, ".enterButton");
    await click(mounted.container, '.chapterArrow[aria-label="次の章"]');
    expect(firstAudio.fadeOutAndDispose).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(2_100));
    const secondAudio = audioMockState.instances[1]!;
    expect(secondAudio.play).toHaveBeenCalledWith(0);
    expect(mounted.container.textContent).toContain("Spectral Cathedral");

    await unmountApp(mounted);
  });

  it("exposes all ten formal chapters from the default and legacy preview URLs", () => {
    const expected = [
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
    ];
    expect(getPatternRegistry("").map((pattern) => pattern.id)).toEqual(expected);
    expect(getPatternRegistry("?chapters=preview").map((pattern) => pattern.id)).toEqual(expected);
  });
});
