/// <reference types="node" />

import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

import mobiusChoirSource from "../../public/audio/chapters/mobius-choir.js?raw";
import residueBloomSource from "../../public/audio/chapters/residue-bloom.js?raw";
import sharedSource from "../../public/audio/chapters/shared.js?raw";
import spectralCathedralSource from "../../public/audio/chapters/spectral-cathedral.js?raw";
import workletSource from "../../public/audio/fourier-worklet.js?raw";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
} from "../patterns/residue-bloom/audio/score";
import { createResidueBloomAudioProgram } from "../patterns/residue-bloom/audio/synthesis";
import {
  RESIDUE_BLOOM_SERIES,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
} from "../patterns/residue-bloom/math/model";
import {
  createMobiusChoirWorkletProgram,
  renderMobiusChoirSample,
} from "../patterns/mobius-choir/audio/synthesis";
import {
  createSpectralCathedralWorkletProgram,
  renderSpectralCathedralSample,
} from "../patterns/spectral-cathedral/audio/synthesis";

interface WorkletPortStub {
  onmessage: ((event: { data: unknown }) => void) | null;
  postMessage: ReturnType<typeof vi.fn>;
}

interface WorkletProcessorStub {
  port: WorkletPortStub;
  fade: number;
  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean;
}

interface ChapterProcessorStub {
  createState(program: unknown): unknown;
}

function composeWorkletSource(...sources: readonly string[]): string {
  return sources
    .join("\n")
    .replace(/import\s+[\s\S]*?\s+from\s+["'][^"']+["'];/g, "")
    .replace(/^export\s+/gm, "");
}

const executableWorkletSource = composeWorkletSource(
  sharedSource,
  residueBloomSource,
  spectralCathedralSource,
  mobiusChoirSource,
  workletSource,
);

function loadProcessor(sampleRate: number): WorkletProcessorStub {
  let Processor: (new () => WorkletProcessorStub) | undefined;

  class AudioWorkletProcessorStub {
    port: WorkletPortStub = {
      onmessage: null,
      postMessage: vi.fn<(message: unknown) => void>(),
    };
  }

  const context = vm.createContext({
    AudioWorkletProcessor: AudioWorkletProcessorStub,
    registerProcessor: (name: string, processorConstructor: new () => WorkletProcessorStub) => {
      expect(name).toBe("fourier-garden-processor");
      Processor = processorConstructor;
    },
    sampleRate,
  });
  vm.runInContext(executableWorkletSource, context);

  if (!Processor) {
    throw new Error("The worklet did not register its processor");
  }
  return new Processor();
}

function loadChapterProcessor(
  source: string,
  exportName: string,
  sampleRate: number,
): ChapterProcessorStub {
  const context = vm.createContext({ sampleRate });
  const executableSharedSource = sharedSource.replace(/^export\s+/gm, "");
  context.sharedModule = vm.runInContext(
    `(() => { ${executableSharedSource}\nreturn { clamp, getEqualPowerPanGains, hashUint32, isFiniteNumber, isPositiveFinite, isNonnegativeFinite }; })()`,
    context,
  );

  const executableChapterSource = source
    .replace(
      /import\s+\{([^}]+)\}\s+from\s+["']\.\/shared\.js(?:\?v=\d+)?["'];/,
      "const {$1} = sharedModule;",
    )
    .replace(/^export\s+/gm, "");
  vm.runInContext(
    `${executableChapterSource}\nglobalThis.chapterProcessor = ${exportName};`,
    context,
  );

  return context.chapterProcessor as ChapterProcessorStub;
}

function send(processor: WorkletProcessorStub, data: unknown): void {
  processor.port.onmessage?.({ data });
}

function createOutputs(frameCount: number): Float32Array[][] {
  return [
    [new Float32Array(frameCount), new Float32Array(frameCount)],
    [new Float32Array(frameCount), new Float32Array(frameCount)],
  ];
}

describe("AudioWorklet runtime", () => {
  it("initializes the Möbius Choir processor from its declared module dependencies", () => {
    const processor = loadChapterProcessor(mobiusChoirSource, "mobiusChoirProcessor", 48_000);

    expect(() => processor.createState(createMobiusChoirWorkletProgram())).not.toThrow();
  });

  it.each(
    [44_100, 48_000, 96_000].flatMap((sampleRate) =>
      [0.01, 10.7, 28.3, 42.4, 56.46, 56.52].map(
        (startTimeSeconds) => [sampleRate, startTimeSeconds] as const,
      ),
    ),
  )("matches the Möbius Choir renderer at %i Hz and %s seconds", (sampleRate, startTimeSeconds) => {
    const frameCount = 64;
    const program = createMobiusChoirWorkletProgram();
    const processor = loadProcessor(sampleRate);
    const outputs = createOutputs(frameCount);

    send(processor, { type: "configure", program });
    send(processor, { type: "seek", seconds: startTimeSeconds });
    send(processor, { type: "active", value: true });
    processor.fade = 1;
    processor.process([], outputs);

    for (let frame = 0; frame < frameCount; frame += 1) {
      const expected = renderMobiusChoirSample(
        program,
        startTimeSeconds + frame / sampleRate,
        sampleRate,
      );
      expect(Math.abs(outputs[0]![0]![frame]! - expected.dryLeft)).toBeLessThanOrEqual(1e-7);
      expect(Math.abs(outputs[0]![1]![frame]! - expected.dryRight)).toBeLessThanOrEqual(1e-7);
      expect(Math.abs(outputs[1]![0]![frame]! - expected.wetLeft)).toBeLessThanOrEqual(1e-7);
      expect(Math.abs(outputs[1]![1]![frame]! - expected.wetRight)).toBeLessThanOrEqual(1e-7);
    }
  });

  it.each(
    [44_100, 48_000, 96_000].flatMap((sampleRate) =>
      [0.07, 14.2, 33.4, 51.1, 69.8, 75.04].map(
        (startTimeSeconds) => [sampleRate, startTimeSeconds] as const,
      ),
    ),
  )("matches the five-act Spectral Cathedral renderer at %i Hz and %s seconds", (sampleRate, startTimeSeconds) => {
    const frameCount = 64;
    const program = createSpectralCathedralWorkletProgram();
    const processor = loadProcessor(sampleRate);
    const outputs = createOutputs(frameCount);

    send(processor, { type: "configure", program });
    send(processor, { type: "seek", seconds: startTimeSeconds });
    send(processor, { type: "active", value: true });
    processor.fade = 1;
    processor.process([], outputs);

    for (let frame = 0; frame < frameCount; frame += 1) {
      const expected = renderSpectralCathedralSample(
        program,
        startTimeSeconds + frame / sampleRate,
        sampleRate,
      );
      expect(Math.abs(outputs[0]![0]![frame]! - expected.dryLeft)).toBeLessThanOrEqual(1e-7);
      expect(Math.abs(outputs[0]![1]![frame]! - expected.dryRight)).toBeLessThanOrEqual(1e-7);
      expect(Math.abs(outputs[1]![0]![frame]! - expected.wetLeft)).toBeLessThanOrEqual(1e-7);
      expect(Math.abs(outputs[1]![1]![frame]! - expected.wetRight)).toBeLessThanOrEqual(1e-7);
    }
  });

  it("repeats exactly after seeking to the same absolute time", () => {
    const program = createSpectralCathedralWorkletProgram();
    const processor = loadProcessor(48_000);

    send(processor, { type: "configure", program });
    send(processor, { type: "active", value: true });
    send(processor, { type: "seek", seconds: 0.01 });
    processor.fade = 1;
    const first = createOutputs(128);
    processor.process([], first);

    send(processor, { type: "seek", seconds: 0.01 });
    processor.fade = 1;
    const repeated = createOutputs(128);
    processor.process([], repeated);

    expect(repeated).toEqual(first);
  });

  it("uses the shared fade when becoming inactive", () => {
    const processor = loadProcessor(48_000);

    send(processor, {
      type: "configure",
      program: createSpectralCathedralWorkletProgram(),
    });
    send(processor, { type: "seek", seconds: 0.01 });
    send(processor, { type: "active", value: false });
    processor.fade = 1;
    processor.process([], createOutputs(128));

    expect(processor.fade).toBeCloseTo((1 - 0.0018) ** 128, 12);
  });

  it("reports an unknown program once and renders silence", () => {
    const processor = loadProcessor(48_000);
    const outputs = createOutputs(64);

    send(processor, {
      type: "configure",
      program: { kind: "unknown-program" },
    });
    send(processor, { type: "active", value: true });
    processor.process([], outputs);
    processor.process([], outputs);

    expect(processor.port.postMessage).toHaveBeenCalledTimes(1);
    expect(processor.port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
    expect(outputs.flat().every((channel) => channel.every((sample) => sample === 0))).toBe(true);
  });

  it("rejects non-finite Chapter 2 configuration values", () => {
    const processor = loadProcessor(48_000);
    const program = createSpectralCathedralWorkletProgram();

    send(processor, {
      type: "configure",
      program: { ...program, normalization: Number.NaN },
    });
    processor.process([], createOutputs(16));

    expect(processor.port.postMessage).toHaveBeenCalledTimes(1);
  });

  it("rejects finite but invalid Chapter 2 synthesis ranges", () => {
    const processor = loadProcessor(48_000);
    const program = createSpectralCathedralWorkletProgram();

    send(processor, {
      type: "configure",
      program: {
        ...program,
        synthesis: {
          ...program.synthesis,
          maximumPartials: 0,
        },
      },
    });
    expect(() => processor.process([], createOutputs(16))).not.toThrow();

    expect(processor.port.postMessage).toHaveBeenCalledTimes(1);
  });

  it("rejects a dissonant Chapter 3 mode set before processing", () => {
    const processor = loadProcessor(48_000);
    const program = createMobiusChoirWorkletProgram();
    const events = [...program.score.events];
    events[0] = { ...events[0]!, modeIds: [2, 4] };
    send(processor, {
      type: "configure",
      program: {
        ...program,
        score: {
          ...program.score,
          events,
        },
      },
    });
    processor.process([], createOutputs(16));

    expect(processor.port.postMessage).toHaveBeenCalledTimes(1);
  });

  it("rejects an incomplete Chapter 2 event table", () => {
    const processor = loadProcessor(48_000);
    const program = createSpectralCathedralWorkletProgram();

    send(processor, {
      type: "configure",
      program: {
        ...program,
        score: {
          ...program.score,
          events: program.score.events.slice(0, -1),
        },
      },
    });
    expect(() => processor.process([], createOutputs(16))).not.toThrow();

    expect(processor.port.postMessage).toHaveBeenCalledTimes(1);
  });

  it("rejects a Residue Bloom program with an empty event table before processing", () => {
    const score = buildMusicalScoreProgram(
      RESIDUE_BLOOM_SCORE_DEFINITION,
      RESIDUE_BLOOM_SERIES,
      55,
      RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
    );
    const processor = loadProcessor(48_000);
    const program = createResidueBloomAudioProgram(score).worklet;

    send(processor, {
      type: "configure",
      program: {
        ...program,
        score: {
          ...score,
          events: [],
        },
      },
    });
    expect(() => processor.process([], createOutputs(16))).not.toThrow();

    expect(processor.port.postMessage).toHaveBeenCalledTimes(1);
  });

  it("continues to render the Residue Bloom program", () => {
    const score = buildMusicalScoreProgram(
      RESIDUE_BLOOM_SCORE_DEFINITION,
      RESIDUE_BLOOM_SERIES,
      55,
      RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
    );
    const processor = loadProcessor(48_000);
    const outputs = createOutputs(256);

    send(processor, {
      type: "configure",
      program: createResidueBloomAudioProgram(score).worklet,
    });
    send(processor, { type: "seek", seconds: 0.01 });
    send(processor, { type: "active", value: true });
    processor.fade = 1;
    processor.process([], outputs);

    expect(outputs[0]![0]!.some((sample) => sample !== 0)).toBe(true);
    expect(outputs.flat().every((channel) => channel.every(Number.isFinite))).toBe(true);
  });
});
