import { afterEach, describe, expect, it, vi } from "vitest";

import { patternRegistry } from "../patterns/registry";
import { createSpectralCathedralAudioProgram } from "../patterns/spectral-cathedral/audio/synthesis";
import { AudioEngine, createLimiterCurve } from "./AudioEngine";

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: (reason: Error) => void;
}

interface NodeRecord {
  kind: string;
  options: Record<string, unknown>;
}

interface ConnectionRecord {
  source: string;
  destination: string;
  output?: number;
  input?: number;
}

const rejectDeferred = (_reason: Error) => {};
const resolveDeferred = () => {};

function createDeferred(): Deferred {
  let resolve = resolveDeferred;
  let reject = rejectDeferred;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function installAudioGraphStubs(delays: { load?: Promise<void>; resume?: Promise<void> } = {}) {
  const nodes: NodeRecord[] = [];
  const connections: ConnectionRecord[] = [];
  const lifecycle: string[] = [];
  const workletMessages: unknown[] = [];
  const workletModuleUrls: string[] = [];
  const bufferLengths: number[] = [];
  const gainRamps: { value: number; endTime: number }[] = [];
  let workletReceiver: ((event: { data: unknown }) => void) | null = null;
  let processorErrorReceiver: (() => void) | null = null;
  let contextTime = 0;

  class AudioParamStub {
    value: number;

    constructor(value: number) {
      this.value = value;
    }

    cancelScheduledValues = vi.fn<(cancelTime: number) => void>();
    setValueAtTime = vi.fn<(value: number, startTime: number) => void>();
    linearRampToValueAtTime = vi.fn<(value: number, endTime: number) => void>((value, endTime) => {
      gainRamps.push({ value, endTime });
    });
  }

  class AudioNodeStub {
    readonly kind: string;
    readonly options: Record<string, unknown>;

    constructor(kind: string, options: Record<string, unknown> = {}) {
      this.kind = kind;
      this.options = options;
      nodes.push({ kind, options });
    }

    connect(destination: AudioNodeStub, output?: number, input?: number): AudioNodeStub {
      connections.push({
        source: this.kind,
        destination: destination.kind,
        output,
        input,
      });
      return destination;
    }

    disconnect = vi.fn<() => void>(() => {
      lifecycle.push(`disconnect:${this.kind}`);
    });
  }

  class AudioContextStub {
    sampleRate = 1_000;
    get currentTime() {
      return contextTime;
    }
    destination = new AudioNodeStub("destination");
    audioWorklet = {
      addModule: async (url: string) => {
        workletModuleUrls.push(url);
        await delays.load;
      },
    };
    close = vi.fn<() => Promise<void>>(async () => {
      lifecycle.push("close");
    });
    resume = vi.fn<() => Promise<void>>(async () => {
      await delays.resume;
    });

    createBuffer(numberOfChannels: number, length: number) {
      bufferLengths.push(length);
      const channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
      return {
        numberOfChannels,
        getChannelData: (channel: number) => channels[channel]!,
      };
    }
  }

  class AudioWorkletNodeStub extends AudioNodeStub {
    addEventListener(_type: string, listener: () => void) {
      processorErrorReceiver = listener;
    }
    removeEventListener() {
      processorErrorReceiver = null;
    }
    port = {
      addEventListener: (_type: string, listener: (event: { data: unknown }) => void) => {
        workletReceiver = listener;
      },
      removeEventListener: () => {
        workletReceiver = null;
      },
      start: vi.fn<() => void>(),
      postMessage: (message: unknown) => {
        workletMessages.push(message);
      },
    };

    constructor(_context: AudioContextStub, _name: string, options: Record<string, unknown>) {
      super("worklet", options);
    }
  }

  class BiquadFilterNodeStub extends AudioNodeStub {
    constructor(_context: AudioContextStub, options: Record<string, unknown>) {
      super(`biquad:${String(options.type)}`, options);
    }
  }

  class GainNodeStub extends AudioNodeStub {
    gain: AudioParamStub;

    constructor(_context: AudioContextStub, options: Record<string, unknown>) {
      super("gain", options);
      this.gain = new AudioParamStub(Number(options.gain));
    }
  }

  class ConvolverNodeStub extends AudioNodeStub {
    constructor(_context: AudioContextStub, options: Record<string, unknown>) {
      super("convolver", options);
    }
  }

  class DynamicsCompressorNodeStub extends AudioNodeStub {
    constructor(_context: AudioContextStub, options: Record<string, unknown>) {
      super("compressor", options);
    }
  }

  class WaveShaperNodeStub extends AudioNodeStub {
    constructor(_context: AudioContextStub, options: Record<string, unknown>) {
      super("waveshaper", options);
    }
  }

  class AnalyserNodeStub extends AudioNodeStub {
    constructor(_context: AudioContextStub, options: Record<string, unknown>) {
      super("analyser", options);
    }

    getByteFrequencyData = vi.fn<(target: Uint8Array<ArrayBuffer>) => void>();
    getByteTimeDomainData = vi.fn<(target: Uint8Array<ArrayBuffer>) => void>();
  }

  vi.stubGlobal("AudioContext", AudioContextStub);
  vi.stubGlobal("AudioWorkletNode", AudioWorkletNodeStub);
  vi.stubGlobal("BiquadFilterNode", BiquadFilterNodeStub);
  vi.stubGlobal("GainNode", GainNodeStub);
  vi.stubGlobal("ConvolverNode", ConvolverNodeStub);
  vi.stubGlobal("DynamicsCompressorNode", DynamicsCompressorNodeStub);
  vi.stubGlobal("WaveShaperNode", WaveShaperNodeStub);
  vi.stubGlobal("AnalyserNode", AnalyserNodeStub);

  return {
    nodes,
    connections,
    lifecycle,
    workletMessages,
    workletModuleUrls,
    bufferLengths,
    gainRamps,
    deliverWorkletMessage: (data: unknown) => workletReceiver?.({ data }),
    deliverProcessorError: () => processorErrorReceiver?.(),
    setContextTime: (value: number) => {
      contextTime = value;
    },
  };
}

function getResidueBloomPattern() {
  const pattern = patternRegistry[0];
  if (pattern?.kind !== "residue-bloom") throw new Error("Residue Bloom is missing");
  return pattern;
}

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("AudioEngine initialization", () => {
  it.each(["program", "processor"] as const)(
    "rejects further starts and closes the master after a %s failure",
    async (kind) => {
      const records = installAudioGraphStubs();
      const audio = new AudioEngine(createSpectralCathedralAudioProgram());
      await audio.play(0);
      if (kind === "program")
        records.deliverWorkletMessage({ type: "error", message: "Invalid program" });
      else records.deliverProcessorError();
      await expect(audio.play(2)).rejects.toThrow(
        kind === "program" ? "Invalid program" : "音声処理が停止しました",
      );
      expect(records.gainRamps.at(-1)?.value).toBe(0);
      expect(
        records.workletMessages.filter(
          (message) =>
            typeof message === "object" &&
            message !== null &&
            "type" in message &&
            message.type === "start",
        ),
      ).toHaveLength(1);
      await audio.dispose();
    },
  );
  it("spreads the new master entrance over the old chapter's remaining release", async () => {
    const records = installAudioGraphStubs();
    const audio = new AudioEngine(createSpectralCathedralAudioProgram());
    const epoch = await audio.play(0, 0.5);
    expect(records.gainRamps.at(-1)?.endTime).toBeCloseTo(epoch + 0.5, 12);
    audio.pause();
    const resumedEpoch = await audio.play(2);
    expect(records.gainRamps.at(-1)?.endTime).toBeCloseTo(resumedEpoch + 0.065, 12);
    await audio.dispose();
  });

  it("cancels a release timer when the chapter is disposed early", async () => {
    vi.useFakeTimers();
    const records = installAudioGraphStubs();
    const audio = new AudioEngine(createSpectralCathedralAudioProgram());
    await audio.play(0);
    const release = audio.fadeOutAndDispose({ preserveTail: true });
    await audio.dispose();
    expect(vi.getTimerCount()).toBe(0);
    await release;
    expect(records.lifecycle.filter((event) => event === "close")).toHaveLength(1);
  });

  it("exposes the same audible release envelope for a chapter afterimage", async () => {
    vi.useFakeTimers();
    const records = installAudioGraphStubs();
    const audio = new AudioEngine(createSpectralCathedralAudioProgram());
    await audio.play(0);
    records.setContextTime(1);
    const disposal = audio.fadeOutAndDispose({ preserveTail: true });
    expect(audio.departureGain).toBeCloseTo(1, 8);
    records.setContextTime(1.275);
    expect(audio.departureGain).toBeCloseTo(0.5, 8);
    await vi.advanceTimersByTimeAsync(549);
    expect(records.lifecycle).toEqual([]);
    records.setContextTime(1.55);
    expect(audio.departureGain).toBeCloseTo(0, 8);
    await vi.advanceTimersByTimeAsync(1);
    await disposal;
    expect(records.lifecycle.at(-1)).toBe("close");
    expect(audio.departureGain).toBe(0);
  });

  it("measures fresh worklet observations and invalidates them on pause", async () => {
    const stubs = installAudioGraphStubs();
    const audio = new AudioEngine(createSpectralCathedralAudioProgram());
    await audio.play(30);
    audio.requestPositionObservation();
    expect(stubs.workletMessages.at(-1)).toEqual({ type: "observe-position", requestId: 1 });
    stubs.setContextTime(0.12);
    stubs.deliverWorkletMessage({
      type: "position",
      requestId: 1,
      contextFrame: 128,
      positionFrame: 30_078,
      minimumPositionFrame: 30_000,
      sampleRate: 1_000,
      active: true,
    });
    expect(audio.readSynchronization(30.068)?.visualLeadMs).toBeCloseTo(4, 8);
    audio.pause();
    stubs.deliverWorkletMessage({
      type: "position",
      requestId: 1,
      contextFrame: 128,
      positionFrame: 30_078,
      minimumPositionFrame: 30_000,
      sampleRate: 1_000,
      active: true,
    });
    expect(audio.readSynchronization(30.068)).toBeNull();
    await audio.dispose();
  });
  it("cancels a pending start when paused while its module is loading", async () => {
    const loading = createDeferred();
    const records = installAudioGraphStubs({ load: loading.promise });
    const audio = new AudioEngine(createSpectralCathedralAudioProgram());
    const pending = audio.play(12).catch((error: unknown) => error);
    audio.pause();
    loading.resolve();
    expect(await pending).toMatchObject({ name: "AbortError" });
    expect(records.workletMessages).not.toContainEqual(expect.objectContaining({ type: "start" }));
    await audio.dispose();
  });

  it("lets only the latest requested position start after a delayed context resume", async () => {
    const resuming = createDeferred();
    const records = installAudioGraphStubs({ resume: resuming.promise });
    const audio = new AudioEngine(createSpectralCathedralAudioProgram());
    await audio.initialize();
    const old = audio.play(12).catch((error: unknown) => error);
    const current = audio.play(24);
    resuming.resolve();
    expect(await old).toMatchObject({ name: "AbortError" });
    await current;
    expect(
      records.workletMessages.filter((message) => (message as { type: string }).type === "start"),
    ).toEqual([expect.objectContaining({ type: "start", seconds: 24 })]);
    await audio.dispose();
  });
  it("returns the single future epoch sent atomically to the worklet", async () => {
    const records = installAudioGraphStubs();
    const audio = new AudioEngine(createSpectralCathedralAudioProgram());
    const epoch = await audio.play(12.5);
    expect(epoch).toBeGreaterThanOrEqual(0.04);
    expect(epoch).toBeLessThanOrEqual(0.08);
    expect(records.workletMessages.at(-1)).toEqual({
      type: "start",
      seconds: 12.5,
      contextTime: epoch,
    });
    expect(records.workletMessages).toHaveLength(2);
    await audio.dispose();
  });

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
    const pattern = getResidueBloomPattern();
    const audio = new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume);

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
    const pattern = getResidueBloomPattern();
    const audio = new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume);

    await expect(audio.initialize()).rejects.toThrow("worklet load failed");

    expect(close).toHaveBeenCalledTimes(1);
    expect(audio.initialized).toBe(false);
  });

  it("closes a context when disposed while the worklet module is still loading", async () => {
    const deferred = createDeferred();
    const close = vi.fn<() => Promise<void>>(async () => {});
    vi.stubGlobal(
      "AudioContext",
      class {
        audioWorklet = {
          addModule: () => deferred.promise,
        };

        close = close;
      },
    );
    const pattern = patternRegistry[0];
    if (pattern?.kind !== "residue-bloom") throw new Error("Residue Bloom is missing");
    const audio = new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume);

    const initialization = audio.initialize();
    const disposal = audio.dispose();
    deferred.resolve();
    await Promise.allSettled([initialization, disposal]);

    expect(close).toHaveBeenCalledTimes(1);
    expect(audio.initialized).toBe(false);
    await expect(audio.play(0)).rejects.toThrow(/disposed/i);
  });

  it("lets the master fade finish before disconnecting an active chapter", async () => {
    vi.useFakeTimers();
    const records = installAudioGraphStubs();
    const pattern = getResidueBloomPattern();
    const audio = new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume);
    await audio.play(0);

    const disposal = audio.fadeOutAndDispose();

    expect(records.workletMessages.at(-1)).toEqual({ type: "active", value: false });
    expect(records.lifecycle).toEqual([]);

    await vi.advanceTimersByTimeAsync(159);
    expect(records.lifecycle).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    await disposal;
    expect(records.lifecycle[0]).toBe("disconnect:worklet");
    expect(records.lifecycle.at(-1)).toBe("close");
  });

  it("initializes the Residue program and exposes its sample rate with a limited output", async () => {
    const records = installAudioGraphStubs();
    const pattern = getResidueBloomPattern();
    const audio = new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume);

    expect(audio.sampleRateHz).toBeNull();
    await audio.initialize();

    expect(audio.sampleRateHz).toBe(1_000);
    expect(records.workletModuleUrls).toEqual(["/audio/fourier-worklet.js?v=30"]);
    expect(records.workletMessages).toEqual([
      expect.objectContaining({
        type: "configure",
        program: expect.objectContaining({ kind: "residue-bloom" }),
      }),
    ]);
    expect(records.nodes.find((node) => node.kind === "waveshaper")?.options.oversample).toBe("4x");
    expect(records.bufferLengths).toEqual([820]);
    expect(records.connections).toContainEqual({
      source: "waveshaper",
      destination: "analyser",
      output: undefined,
      input: undefined,
    });
  });

  it("applies a supplied graph preset with a post-compressor limiter", async () => {
    const records = installAudioGraphStubs();
    const audio = new AudioEngine({
      worklet: createSpectralCathedralAudioProgram().worklet,
      graph: {
        dryHighPassHz: 220,
        dryHighPassQ: 0.45,
        dryHighShelfHz: 1_200,
        dryHighShelfGainDb: -7,
        dryLowPassHz: 1_750,
        dryLowPassQ: 0.25,
        dryGain: 0.92,
        wetHighPassHz: 220,
        wetHighPassQ: 0.45,
        wetLowPassHz: 1_050,
        wetLowPassQ: 0.25,
        wetGain: 0.03,
        roomSeconds: 0.55,
        roomDecay: 1.3,
        compressor: {
          thresholdDb: -16,
          kneeDb: 12,
          ratio: 3,
          attackSeconds: 0.006,
          releaseSeconds: 0.18,
        },
        limiterCeilingDbfs: -1,
      },
    });

    await audio.initialize();

    expect(records.workletMessages).toEqual([
      expect.objectContaining({
        type: "configure",
        program: expect.objectContaining({ kind: "spectral-cathedral" }),
      }),
    ]);
    expect(
      records.nodes.filter((node) => node.kind.startsWith("biquad:")).map((node) => node.options),
    ).toEqual([
      { type: "highpass", frequency: 220, Q: 0.45 },
      { type: "highshelf", frequency: 1_200, gain: -7 },
      { type: "lowpass", frequency: 1_750, Q: 0.25 },
      { type: "highpass", frequency: 220, Q: 0.45 },
      { type: "lowpass", frequency: 1_050, Q: 0.25 },
    ]);
    expect(records.nodes.filter((node) => node.kind === "gain").slice(0, 2)).toEqual([
      { kind: "gain", options: { gain: 0.92 } },
      { kind: "gain", options: { gain: 0.03 } },
    ]);
    expect(records.nodes.find((node) => node.kind === "compressor")?.options).toEqual({
      threshold: -16,
      knee: 12,
      ratio: 3,
      attack: 0.006,
      release: 0.18,
    });
    const limiter = records.nodes.find((node) => node.kind === "waveshaper");
    expect(limiter?.options.oversample).toBe("4x");
    expect(
      Math.max(...Array.from(limiter?.options.curve as Float32Array, Math.abs)),
    ).toBeLessThanOrEqual(10 ** (-1 / 20));
    expect(records.bufferLengths).toEqual([550]);
    expect(records.connections).toContainEqual({
      source: "compressor",
      destination: "waveshaper",
      output: undefined,
      input: undefined,
    });
    expect(records.connections).toContainEqual({
      source: "waveshaper",
      destination: "analyser",
      output: undefined,
      input: undefined,
    });
  });
});

describe("AudioEngine limiter", () => {
  it("hard-clamps a symmetric curve at the requested dBFS ceiling", () => {
    const curve = createLimiterCurve(-1, 2_049);
    const ceiling = 10 ** (-1 / 20);

    expect(Math.max(...Array.from(curve, Math.abs))).toBeLessThanOrEqual(ceiling);
    expect(curve[0]).toBeCloseTo(-ceiling, 7);
    expect(curve[1_024]).toBeCloseTo(0, 7);
    expect(curve.at(-1)).toBeCloseTo(ceiling, 7);
  });
});
