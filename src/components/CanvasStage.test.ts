import { describe, expect, it } from "vitest";

import { getSceneQualityPreference } from "./CanvasStage";

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
