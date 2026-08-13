import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Transport } from "../core/transport";
import type { PatternDefinition, PatternScene } from "../patterns/contracts";
import { patternRegistry } from "../patterns/registry";
import { getSceneQualityPreference } from "./CanvasStage";
import { CanvasStage } from "./CanvasStage";

afterEach(() => {
  vi.unstubAllGlobals();
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
  it("allows restoration and stops rendering when the context is lost", async () => {
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
