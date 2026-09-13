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
    setMuted: ReturnType<typeof vi.fn>;
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    fadeOutAndDispose: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    emitError: (error: Error) => void;
  }>,
}));

const sceneMockState = vi.hoisted(() => ({
  scenes: [] as Array<{
    id: string;
    generation: number;
    notify: (status: "loading" | "ready" | "error") => void;
  }>,
}));

vi.mock("./audio/AudioEngine", () => ({
  AudioEngine: class {
    currentTime = 0;
    presentationTime = 0;
    departureSecondsRemaining = 0.5;
    currentVolume: number;
    play = vi.fn<() => Promise<number>>(async () => 0.05);
    pause = vi.fn<() => void>();
    setMuted = vi.fn<(muted: boolean) => void>();
    fadeOutAndDispose = vi.fn<() => Promise<void>>(async () => {});
    setVolume = vi.fn<(value: number) => void>((value) => {
      this.currentVolume = value;
    });
    dispose = vi.fn<() => Promise<void>>(async () => {});
    private errorListeners = new Set<(error: Error) => void>();
    subscribeToErrors(listener: (error: Error) => void) {
      this.errorListeners.add(listener);
      return () => {
        this.errorListeners.delete(listener);
      };
    }
    emitError(error: Error) {
      for (const listener of this.errorListeners) listener(error);
    }

    constructor(_program: unknown, initialVolume: number) {
      this.currentVolume = initialVolume;
      audioMockState.instances.push(this);
    }
  },
}));

vi.mock("./components/CanvasStage", () => ({
  CanvasStage: ({
    pattern,
    sceneGeneration,
    onStatus,
  }: {
    pattern: { id: string };
    sceneGeneration: number;
    onStatus: (status: "loading" | "ready" | "error", generation: number) => void;
  }) => {
    useEffect(() => {
      sceneMockState.scenes.push({
        id: pattern.id,
        generation: sceneGeneration,
        notify: (status) => onStatus(status, sceneGeneration),
      });
      onStatus("ready", sceneGeneration);
    }, [onStatus, pattern.id, sceneGeneration]);
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
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  audioMockState.instances.length = 0;
  sceneMockState.scenes.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("App entry gate", () => {
  it.each(['[data-action="retry-audio"]', ".primaryControl"])(
    "rebuilds a failed worklet when restarting via %s",
    async (restartControl) => {
      const mounted = await mountApp();
      await click(mounted.container, ".enterButton");
      const failedAudio = audioMockState.instances[0]!;
      await act(async () => failedAudio.emitError(new Error("Processor failed")));
      expect(
        mounted.container.querySelector('.primaryControl[aria-label="再生 (Space)"]'),
      ).not.toBeNull();
      expect(mounted.container.querySelector('[data-action="retry-audio"]')).not.toBeNull();
      await click(mounted.container, restartControl);
      expect(audioMockState.instances).toHaveLength(2);
      expect(failedAudio.dispose).toHaveBeenCalledOnce();
      expect(
        mounted.container.querySelector('.primaryControl[aria-label="一時停止 (Space)"]'),
      ).not.toBeNull();
      await act(async () => failedAudio.emitError(new Error("Old processor failed again")));
      expect(mounted.container.querySelector('[data-action="retry-audio"]')).toBeNull();
      await unmountApp(mounted);
    },
  );
  it("enables sound without resuming a paused silent visit", async () => {
    const mounted = await mountApp();
    await click(mounted.container, '[data-action="enter-silent"]');
    await click(mounted.container, ".primaryControl");
    await click(mounted.container, '[aria-label="音をオンにする (M)"]');
    expect(audioMockState.instances[0]!.play).not.toHaveBeenCalled();
    expect(
      mounted.container.querySelector('.primaryControl[aria-label="再生 (Space)"]'),
    ).not.toBeNull();
    await click(mounted.container, ".primaryControl");
    expect(audioMockState.instances[0]!.play).toHaveBeenCalledTimes(1);
    await unmountApp(mounted);
  });

  it("shows a dismissible fullscreen failure without treating the scene as broken", async () => {
    const mounted = await mountApp();
    await click(mounted.container, '[data-action="enter-silent"]');
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" })));
    expect(mounted.container.querySelector("output.audioNotice")?.textContent).toContain("全画面");
    expect(mounted.container.querySelector('[data-action="retry-scene"]')).toBeNull();
    expect(
      mounted.container.querySelector('.primaryControl[aria-label="一時停止 (Space)"]'),
    ).not.toBeNull();
    await click(mounted.container, '[data-action="dismiss-notice"]');
    expect(mounted.container.querySelector('[data-action="dismiss-notice"]')).toBeNull();
    await unmountApp(mounted);
  });

  it("offers silent continuation and a concrete retry when audio cannot initialize", async () => {
    const mounted = await mountApp();
    const audio = audioMockState.instances[0]!;
    audio.play.mockRejectedValueOnce(new Error("AudioContext unavailable"));
    await click(mounted.container, ".enterButton");
    expect(mounted.container.querySelector('[role="alert"]')).not.toBeNull();
    await click(mounted.container, '[data-action="continue-silent"]');
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(
      mounted.container.querySelector('.primaryControl[aria-label="一時停止 (Space)"]'),
    ).not.toBeNull();
    await click(mounted.container, '[data-action="retry-audio"]');
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audioMockState.instances.at(-1)!.play).toHaveBeenCalledOnce();
    expect(mounted.container.querySelector('[data-action="retry-audio"]')).toBeNull();
    await unmountApp(mounted);
  });

  it("retries a failed scene with a new generation while keeping audio paused", async () => {
    const mounted = await mountApp();
    await click(mounted.container, ".enterButton");
    await act(async () => sceneMockState.scenes.at(-1)!.notify("error"));
    await click(mounted.container, '[data-action="retry-scene"]');
    expect(sceneMockState.scenes.at(-1)!.generation).toBe(1);
    expect(audioMockState.instances[0]!.play).toHaveBeenCalledTimes(1);
    expect(mounted.container.querySelector('[data-action="retry-scene"]')).toBeNull();
    await unmountApp(mounted);
  });
  it("cancels the first pending start with the playback control", async () => {
    const mounted = await mountApp();
    const audio = audioMockState.instances[0]!;
    let resolveStart: (epoch: number) => void;
    audio.play.mockImplementationOnce(
      () =>
        new Promise<number>((resolve) => {
          resolveStart = resolve;
        }),
    );
    await click(mounted.container, ".enterButton");
    await click(mounted.container, ".primaryControl");
    await act(async () => resolveStart!(0.05));
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(
      mounted.container.querySelector('.primaryControl[aria-label="再生 (Space)"]'),
    ).not.toBeNull();
    await unmountApp(mounted);
  });

  it("pauses sound during scene recovery and restarts from the held position after readiness", async () => {
    const mounted = await mountApp();
    const audio = audioMockState.instances[0]!;
    await click(mounted.container, ".enterButton");
    const scene = sceneMockState.scenes.at(-1)!;
    await act(async () => scene.notify("loading"));
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(
      mounted.container.querySelector('.primaryControl[aria-label="一時停止 (Space)"]'),
    ).toBeNull();
    await act(async () => scene.notify("ready"));
    expect(audio.play).toHaveBeenCalledTimes(2);
    await unmountApp(mounted);
  });

  it("starts the next chapter while the old reverberation is still releasing", async () => {
    vi.useFakeTimers();
    const mounted = await mountApp();
    await click(mounted.container, ".enterButton");
    let finishFade: () => void;
    audioMockState.instances[0]!.fadeOutAndDispose.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishFade = resolve;
        }),
    );
    await click(mounted.container, '.chapterArrow[aria-label="次の章"]');
    expect(sceneMockState.scenes.map((scene) => [scene.id, scene.generation])).toEqual([
      ["residue-bloom", 0],
      ["spectral-cathedral", 1],
    ]);
    expect(audioMockState.instances[1]!.play).toHaveBeenCalledWith(0, 0.5);
    expect(mounted.container.querySelector(".chapterTransition")?.textContent).toContain(
      "Residue Bloom",
    );
    await act(async () => sceneMockState.scenes[0]!.notify("error"));
    expect(mounted.container.querySelector('[data-action="retry-scene"]')).toBeNull();
    await act(async () => finishFade!());
    await unmountApp(mounted);
  });
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
    expect(secondAudio.play).toHaveBeenCalledWith(0, 0.5);
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

  it("offers a silent entrance and restores sound without changing the selected volume", async () => {
    const mounted = await mountApp();
    await click(mounted.container, '[data-action="enter-silent"]');
    const audio = audioMockState.instances[0]!;
    expect(audio.setMuted).toHaveBeenLastCalledWith(true);
    expect(audio.play).not.toHaveBeenCalled();
    await click(mounted.container, '[aria-label="音をオンにする (M)"]');
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.setMuted).toHaveBeenLastCalledWith(false);
    expect(audio.currentVolume).toBe(0.35);
    await unmountApp(mounted);
  });

  it("opens a direct chapter index and selects the last chapter without stepping through nine others", async () => {
    vi.useFakeTimers();
    const mounted = await mountApp();
    await click(mounted.container, ".enterButton");
    await click(mounted.container, '[aria-label="章を選ぶ (C)"]');
    expect(mounted.container.querySelectorAll(".chapterIndex [data-chapter]")).toHaveLength(10);
    await click(mounted.container, '[data-chapter="phase-torus"]');
    await act(async () => vi.advanceTimersByTimeAsync(2_100));
    expect(mounted.container.querySelector('[data-testid="scene-phase-torus"]')).not.toBeNull();
    expect(audioMockState.instances).toHaveLength(2);
    await unmountApp(mounted);
  });

  it("leaves Space to a focused input and closes the index with Escape", async () => {
    const mounted = await mountApp();
    await click(mounted.container, ".enterButton");
    const volume = mounted.container.querySelector<HTMLInputElement>('[aria-label="音量"]')!;
    volume.focus();
    await act(async () =>
      volume.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }),
      ),
    );
    expect(audioMockState.instances[0]!.pause).not.toHaveBeenCalled();
    await click(mounted.container, '[aria-label="章を選ぶ (C)"]');
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(mounted.container.querySelector(".chapterIndex")).toBeNull();
    await unmountApp(mounted);
  });
});
