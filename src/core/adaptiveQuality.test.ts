import { describe, expect, it } from "vitest";

import { AdaptiveQuality } from "./adaptiveQuality";

describe("AdaptiveQuality", () => {
  it("reduces atmospheric quality after sustained slow frames", () => {
    const quality = new AdaptiveQuality("high", 8);

    for (let index = 0; index < 8; index += 1) {
      quality.sample(1 / 42);
    }

    expect(quality.level).toBe("medium");
  });

  it("raises quality only after sustained headroom", () => {
    const quality = new AdaptiveQuality("medium", 8);

    for (let index = 0; index < 8; index += 1) {
      quality.sample(1 / 95);
    }

    expect(quality.level).toBe("high");
  });

  it("never changes more than one level per sampling window", () => {
    const quality = new AdaptiveQuality("ultra", 4);

    for (let index = 0; index < 4; index += 1) {
      quality.sample(1 / 20);
    }

    expect(quality.level).toBe("high");
  });
});
