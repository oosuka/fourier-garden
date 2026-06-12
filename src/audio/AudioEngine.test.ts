import { afterEach, describe, expect, it, vi } from "vitest";

import { patternRegistry } from "../patterns/registry";
import { AudioEngine } from "./AudioEngine";

interface Deferred {
  promise: Promise<void>;
  reject: (reason: Error) => void;
}

const rejectDeferred = (_reason: Error) => {};

function createDeferred(): Deferred {
  let reject = rejectDeferred;
  const promise = new Promise<void>((_resolve, rejectPromise) => {
    reject = rejectPromise;
  });
  return { promise, reject };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AudioEngine initialization", () => {
  it("shares one initialization while the worklet module is loading", async () => {
    const deferred = createDeferred();
    const close = vi.fn<() => Promise<void>>(async () => {});
    let contextCount = 0;
    class AudioContextStub {
      audioWorklet = {
        addModule: () => deferred.promise,
      };

      close = close;

      constructor() {
        contextCount += 1;
      }
    }
    vi.stubGlobal("AudioContext", AudioContextStub);
    const pattern = patternRegistry[0]!;
    const audio = new AudioEngine(pattern.audio.score, pattern.audio.initialVolume);

    const first = audio.initialize();
    const second = audio.initialize();

    expect(contextCount).toBe(1);

    deferred.reject(new Error("worklet load failed"));
    await Promise.allSettled([first, second]);
  });

  it("closes a context when initialization fails", async () => {
    const close = vi.fn<() => Promise<void>>(async () => {});
    vi.stubGlobal(
      "AudioContext",
      class {
        audioWorklet = {
          addModule: async () => {
            throw new Error("worklet load failed");
          },
        };

        close = close;
      },
    );
    const pattern = patternRegistry[0]!;
    const audio = new AudioEngine(pattern.audio.score, pattern.audio.initialVolume);

    await expect(audio.initialize()).rejects.toThrow("worklet load failed");

    expect(close).toHaveBeenCalledTimes(1);
    expect(audio.initialized).toBe(false);
  });
});
