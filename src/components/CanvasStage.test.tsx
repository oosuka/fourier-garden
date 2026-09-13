import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Transport } from "../core/transport";
import type { PatternDefinition, PatternScene, PatternSceneOptions } from "../patterns/contracts";
import { patternRegistry } from "../patterns/registry";
import { getCinematicViewportSpan } from "../rendering/cinematic/model";
import { getSceneQualityPreference } from "./CanvasStage";
import { CanvasStage } from "./CanvasStage";

afterEach(() => {
  window.history.replaceState({}, "", "/");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CanvasStage quality query", () => {
  it("keeps adaptive quality enabled when quality is not specified", () => {
    expect(getSceneQualityPreference("?seed=qa")).toEqual({
      initialQuality: "high",
      adaptive: true,
    });
  });

  it("fixes an explicitly requested quality level", () => {
    expect(getSceneQualityPreference("?seed=qa&quality=high")).toEqual({
      initialQuality: "high",
      adaptive: false,
    });
    expect(getSceneQualityPreference("?quality=ultra")).toEqual({
      initialQuality: "ultra",
      adaptive: false,
    });
  });
});

describe("CanvasStage WebGL context recovery", () => {
  it("retains a valid camera when a departing canvas temporarily has no layout size", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    let width = 1200;
    let height = 800;
    vi.spyOn(HTMLCanvasElement.prototype, "clientWidth", "get").mockImplementation(() => width);
    vi.spyOn(HTMLCanvasElement.prototype, "clientHeight", "get").mockImplementation(() => height);
    let status = "loading";
    let validAspect = 0;
    const scene: PatternScene = {
      update: () => {},
      setQuality: () => {},
      dispose: () => {},
      resize: (viewport) => {
        getCinematicViewportSpan(viewport.width / viewport.height);
        validAspect = viewport.width / viewport.height;
      },
    };
    const root = createRoot(document.createElement("div"));
    const pattern = { ...patternRegistry[0]!, loadScene: async () => async () => scene };
    await act(async () =>
      root.render(
        <CanvasStage
          pattern={pattern}
          transport={new Transport(() => 0)}
          playing
          sceneGeneration={0}
          onStatus={(next) => {
            status = next;
          }}
          onError={() => {}}
        />,
      ),
    );
    expect(status).toBe("ready");
    width = height = 0;
    await act(async () => window.dispatchEvent(new Event("resize")));
    expect(status).toBe("ready");
    expect(validAspect).toBe(1.5);
    await act(async () => root.unmount());
  });

  it("passes the motion preference to the first frame and follows live preference changes", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const media = Object.assign(new EventTarget(), { matches: true });
    vi.stubGlobal("matchMedia", () => media);
    let renderFrame: FrameRequestCallback;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      renderFrame = callback;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const preferences: (boolean | undefined)[] = [];
    const scene: PatternScene = {
      update: (frame) => {
        preferences.push(frame.reducedMotion);
      },
      resize: () => {},
      setQuality: () => {},
      dispose: () => {},
    };
    const pattern = { ...patternRegistry[0]!, loadScene: async () => async () => scene };
    const root = createRoot(document.createElement("div"));
    await act(async () =>
      root.render(
        <CanvasStage
          pattern={pattern}
          transport={new Transport(() => 0)}
          playing
          sceneGeneration={0}
          onStatus={() => {}}
          onError={() => {}}
        />,
      ),
    );
    expect(preferences).toEqual([true]);
    media.matches = false;
    media.dispatchEvent(new Event("change"));
    await act(async () => renderFrame!(20));
    expect(preferences).toEqual([true, false]);
    await act(async () => root.unmount());
  });
  it("passes the strict comparison selection into chapter creation", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    window.history.replaceState({}, "", "/?poetic=off");
    let poeticLayers: boolean | undefined;
    const pattern = {
      ...patternRegistry[0]!,
      loadScene: async () => async (options: PatternSceneOptions) => {
        poeticLayers = options.poeticLayers;
        return { update: () => {}, resize: () => {}, setQuality: () => {}, dispose: () => {} };
      },
    };
    const root = createRoot(document.createElement("div"));
    await act(async () =>
      root.render(
        <CanvasStage
          pattern={pattern}
          transport={new Transport(() => 0)}
          playing
          sceneGeneration={0}
          onStatus={() => {}}
          onError={() => {}}
        />,
      ),
    );
    expect(poeticLayers).toBe(false);
    await act(async () => root.unmount());
  });
  it("reports a failed render once and cancels the frame loop for a recoverable error state", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.spyOn(console, "error").mockImplementation(() => {});
    let renderFrame: FrameRequestCallback;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      renderFrame = callback;
      return 1;
    });
    const cancel = vi.fn<(handle: number) => void>();
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const update = vi.fn<PatternScene["update"]>();
    const scene: PatternScene = {
      update,
      resize: vi.fn<PatternScene["resize"]>(),
      setQuality: vi.fn<PatternScene["setQuality"]>(),
      dispose: vi.fn<PatternScene["dispose"]>(),
    };
    const pattern = { ...patternRegistry[0]!, loadScene: async () => async () => scene };
    const onStatus = vi.fn<(status: "loading" | "ready" | "error", generation: number) => void>();
    const onError = vi.fn<(message: string, generation?: number) => void>();
    const root = createRoot(document.createElement("div"));
    await act(async () =>
      root.render(
        <CanvasStage
          pattern={pattern}
          transport={new Transport(() => 0)}
          playing
          sceneGeneration={4}
          onStatus={onStatus}
          onError={onError}
        />,
      ),
    );
    update.mockImplementation(() => {
      throw new Error("GPU render failed");
    });
    await act(async () => renderFrame!(20));
    expect(onStatus).toHaveBeenLastCalledWith("error", 4);
    expect(onError).toHaveBeenLastCalledWith("GPU render failed", 4);
    expect(cancel).toHaveBeenCalledWith(1);
    await act(async () => renderFrame!(40));
    expect(onStatus.mock.calls.filter(([status]) => status === "error")).toHaveLength(1);
    await act(async () => root.unmount());
  });
  it("allows restoration and stops rendering when the context is lost", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const dispose = vi.fn<() => void>();
    const scene: PatternScene = {
      update: vi.fn<PatternScene["update"]>(),
      resize: vi.fn<PatternScene["resize"]>(),
      setQuality: vi.fn<PatternScene["setQuality"]>(),
      dispose,
    };
    const pattern = {
      ...patternRegistry[0]!,
      loadScene: vi.fn<PatternDefinition["loadScene"]>(async () => async () => scene),
    } satisfies PatternDefinition;
    const cancelAnimationFrameMock = vi.fn<(handle: number) => void>();
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn<(callback: FrameRequestCallback) => number>(() => 1),
    );
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrameMock);
    const onStatus = vi.fn<(status: "loading" | "ready" | "error", generation: number) => void>();
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <CanvasStage
          pattern={pattern}
          transport={new Transport(() => 0)}
          playing
          sceneGeneration={0}
          onStatus={onStatus}
          onError={vi.fn<(message: string) => void>()}
        />,
      );
    });

    expect(scene.update).toHaveBeenCalledWith(
      expect.objectContaining({ time: 0, delta: 0, playing: false }),
    );
    expect(onStatus).toHaveBeenCalledWith("ready", 0);
    const contextLost = new Event("webglcontextlost", { cancelable: true });
    await act(async () => {
      container.querySelector("canvas")?.dispatchEvent(contextLost);
    });

    expect(contextLost.defaultPrevented).toBe(true);
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(1);
    expect(onStatus).toHaveBeenLastCalledWith("loading", 0);

    await act(async () => root.unmount());
    expect(dispose).toHaveBeenCalledOnce();
  });
});
