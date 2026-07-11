import { afterEach, describe, expect, it, vi } from "vitest";

import { patternRegistry } from "../patterns/registry";
import { createMobiusChoirAudioProgram } from "../patterns/mobius-choir/audio/synthesis";
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

function installAudioGraphStubs() {
  const nodes: NodeRecord[] = [];
  const connections: ConnectionRecord[] = [];
  const workletMessages: unknown[] = [];
  const workletModuleUrls: string[] = [];
  const bufferLengths: number[] = [];

  class AudioParamStub {
    value: number;

    constructor(value: number) {
      this.value = value;
    }

    cancelScheduledValues = vi.fn<(cancelTime: number) => void>();
    setValueAtTime = vi.fn<(value: number, startTime: number) => void>();
    linearRampToValueAtTime = vi.fn<(value: number, endTime: number) => void>();
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

    disconnect = vi.fn<() => void>();
  }

  class AudioContextStub {
    sampleRate = 1_000;
    currentTime = 0;
    destination = new AudioNodeStub("destination");
    audioWorklet = {
      addModule: async (url: string) => {
        workletModuleUrls.push(url);
      },
    };
    close = vi.fn<() => Promise<void>>(async () => {});
    resume = vi.fn<() => Promise<void>>(async () => {});

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
    port = {
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
    workletMessages,
    workletModuleUrls,
    bufferLengths,
  };
}

function getResidueBloomPattern() {
  const pattern = patternRegistry[0];
  if (pattern?.kind !== "residue-bloom") throw new Error("Residue Bloom is missing");
  return pattern;
}

afterEach(() => {
  localStorage.clear();
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

  it("builds the rounded Residue Bloom graph with the shared piko-family limiter", async () => {
    const records = installAudioGraphStubs();
    const pattern = getResidueBloomPattern();
    const audio = new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume);

    await audio.initialize();

    expect(records.workletModuleUrls).toEqual(["/audio/fourier-worklet.js?v=18"]);
    expect(records.workletMessages).toEqual([
      expect.objectContaining({
        type: "configure",
        program: expect.objectContaining({ kind: "residue-bloom" }),
      }),
    ]);
    expect(
      records.nodes.filter((node) => node.kind.startsWith("biquad:")).map((node) => node.options),
    ).toEqual([
      { type: "highpass", frequency: 190, Q: 0.45 },
      { type: "highshelf", frequency: 1_250, gain: -16 },
      { type: "lowpass", frequency: 2_100, Q: 0.3 },
      { type: "highpass", frequency: 220, Q: 0.45 },
      { type: "lowpass", frequency: 1_450, Q: 0.3 },
    ]);
    expect(records.nodes.filter((node) => node.kind === "gain").slice(0, 2)).toEqual([
      { kind: "gain", options: { gain: 0.9 } },
      { kind: "gain", options: { gain: 0.12 } },
    ]);
    expect(records.nodes.find((node) => node.kind === "compressor")?.options).toEqual({
      threshold: -14,
      knee: 12,
      ratio: 3,
      attack: 0.006,
      release: 0.18,
    });
    expect(records.nodes.find((node) => node.kind === "waveshaper")?.options.oversample).toBe("4x");
    expect(records.bufferLengths).toEqual([1_150]);
    expect(records.connections).toContainEqual({
      source: "waveshaper",
      destination: "analyser",
      output: undefined,
      input: undefined,
    });
  });

  it("builds the Spectral Cathedral graph with a post-compressor limiter", async () => {
    const records = installAudioGraphStubs();
    const audio = new AudioEngine(createSpectralCathedralAudioProgram());

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
      { type: "highshelf", frequency: 1_200, gain: -18 },
      { type: "lowpass", frequency: 1_300, Q: 0.25 },
      { type: "highpass", frequency: 220, Q: 0.45 },
      { type: "lowpass", frequency: 1_050, Q: 0.25 },
    ]);
    expect(records.nodes.filter((node) => node.kind === "gain").slice(0, 2)).toEqual([
      { kind: "gain", options: { gain: 0.92 } },
      { kind: "gain", options: { gain: 0.02 } },
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

  it("builds the Möbius Choir graph with its piko filters and limiter", async () => {
    const records = installAudioGraphStubs();
    const audio = new AudioEngine(createMobiusChoirAudioProgram());

    await audio.initialize();

    expect(records.workletMessages).toEqual([
      expect.objectContaining({
        type: "configure",
        program: expect.objectContaining({ kind: "mobius-choir" }),
      }),
    ]);
    expect(
      records.nodes.filter((node) => node.kind.startsWith("biquad:")).map((node) => node.options),
    ).toEqual([
      { type: "highpass", frequency: 220, Q: 0.45 },
      { type: "highshelf", frequency: 1_000, gain: -24 },
      { type: "lowpass", frequency: 1_080, Q: 0.25 },
      { type: "highpass", frequency: 220, Q: 0.45 },
      { type: "lowpass", frequency: 860, Q: 0.25 },
    ]);
    expect(records.nodes.filter((node) => node.kind === "gain").slice(0, 2)).toEqual([
      { kind: "gain", options: { gain: 0.88 } },
      { kind: "gain", options: { gain: 0.075 } },
    ]);
    expect(records.nodes.find((node) => node.kind === "compressor")?.options).toEqual({
      threshold: -16,
      knee: 12,
      ratio: 3,
      attack: 0.008,
      release: 0.2,
    });
    expect(records.nodes.find((node) => node.kind === "waveshaper")?.options.oversample).toBe("4x");
    expect(records.bufferLengths).toEqual([1_150]);
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
