import { describe, expect, it, vi } from "vitest";

import { DeferredDisposer } from "./deferredDisposer";

describe("DeferredDisposer", () => {
  it("ignores the synthetic StrictMode cleanup when the effect mounts again", async () => {
    const dispose = vi.fn<() => void>();
    const disposer = new DeferredDisposer(dispose);

    const firstCleanup = disposer.mount();
    firstCleanup();
    const finalCleanup = disposer.mount();
    await Promise.resolve();

    expect(dispose).not.toHaveBeenCalled();

    finalCleanup();
    await Promise.resolve();

    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
