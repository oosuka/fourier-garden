import { describe, expect, it } from "vitest";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
} from "../patterns/residue-bloom/audio/score";
import {
  createResidueBloomAudioProgram,
  renderResidueBloomStereo,
} from "../patterns/residue-bloom/audio/synthesis";
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
import { createPhaseTorusWorkletProgram } from "../patterns/phase-torus/audio/synthesis";
import {
  createPikoChapterPrograms,
  getPikoChapterPerformanceTime,
} from "../test-support/pikoChapterPrograms";
import {
  createWorkletOutputs,
  loadChapterProcessor,
  loadWorkletProcessor,
  sendWorkletMessage,
  WORKLET_SOURCES,
} from "../test-support/workletHarness";
import { renderPikoSample } from "./pikoProgram";

describe("AudioWorklet runtime", () => {
  it.each(createPikoChapterPrograms())(
    "renders finite $kind samples through the shared piko processor",
    (program) => {
      const processor = loadWorkletProcessor(48_000);
      sendWorkletMessage(processor, { type: "configure", program });
      sendWorkletMessage(processor, { type: "active", value: true });
      const outputs = createWorkletOutputs(512);
      expect(processor.process([], outputs)).toBe(true);
      const samples = outputs.flatMap((bus) => bus.flatMap((channel) => [...channel]));
      expect(samples.every(Number.isFinite)).toBe(true);
      expect(samples.some((sample) => Math.abs(sample) > 1e-7)).toBe(true);
    },
  );

  it("matches continuous Phase Torus panning in the shared reference renderer", () => {
    const sampleRate = 48_000;
    const startTimeSeconds = 31.27;
    const frameCount = 64;
    const program = createPhaseTorusWorkletProgram();
    const processor = loadWorkletProcessor(sampleRate);
    const outputs = createWorkletOutputs(frameCount);

    sendWorkletMessage(processor, { type: "configure", program });
    sendWorkletMessage(processor, { type: "seek", seconds: startTimeSeconds });
    sendWorkletMessage(processor, { type: "active", value: true });
    processor.fade = 1;
    processor.process([], outputs);

    for (let frame = 0; frame < frameCount; frame += 1) {
      const expected = renderPikoSample(program, startTimeSeconds + frame / sampleRate, sampleRate);
      expect(outputs[0]![0]![frame]).toBeCloseTo(expected.dryLeft, 7);
      expect(outputs[0]![1]![frame]).toBeCloseTo(expected.dryRight, 7);
      expect(outputs[1]![0]![frame]).toBeCloseTo(expected.wetLeft, 7);
      expect(outputs[1]![1]![frame]).toBeCloseTo(expected.wetRight, 7);
    }
  });

  it("initializes the Möbius Choir processor from its declared module dependencies", () => {
    const processor = loadChapterProcessor(
      WORKLET_SOURCES.mobiusChoir,
      "mobiusChoirProcessor",
      48_000,
    );

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
    const processor = loadWorkletProcessor(sampleRate);
    const outputs = createWorkletOutputs(frameCount);

    sendWorkletMessage(processor, { type: "configure", program });
    sendWorkletMessage(processor, { type: "seek", seconds: startTimeSeconds });
    sendWorkletMessage(processor, { type: "active", value: true });
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
  )(
    "matches the five-act Spectral Cathedral renderer at %i Hz and %s seconds",
    (sampleRate, startTimeSeconds) => {
      const frameCount = 64;
      const program = createSpectralCathedralWorkletProgram();
      const processor = loadWorkletProcessor(sampleRate);
      const outputs = createWorkletOutputs(frameCount);

      sendWorkletMessage(processor, { type: "configure", program });
      sendWorkletMessage(processor, { type: "seek", seconds: startTimeSeconds });
      sendWorkletMessage(processor, { type: "active", value: true });
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
    },
  );

  it("repeats exactly after seeking to the same absolute time", () => {
    const program = createSpectralCathedralWorkletProgram();
    const processor = loadWorkletProcessor(48_000);

    sendWorkletMessage(processor, { type: "configure", program });
    sendWorkletMessage(processor, { type: "active", value: true });
    sendWorkletMessage(processor, { type: "seek", seconds: 0.01 });
    processor.fade = 1;
    const first = createWorkletOutputs(128);
    processor.process([], first);

    sendWorkletMessage(processor, { type: "seek", seconds: 0.01 });
    processor.fade = 1;
    const repeated = createWorkletOutputs(128);
    processor.process([], repeated);

    expect(repeated).toEqual(first);
  });

  it.each([createSpectralCathedralWorkletProgram(), createMobiusChoirWorkletProgram()])(
    "renders finite reference-like chapter samples through the worklet",
    (program) => {
      const processor = loadWorkletProcessor(48_000);
      const outputs = createWorkletOutputs(128);

      sendWorkletMessage(processor, { type: "configure", program });
      sendWorkletMessage(processor, { type: "seek", seconds: 28.25 });
      sendWorkletMessage(processor, { type: "active", value: true });
      processor.fade = 1;
      processor.process([], outputs);

      expect(outputs.flat().every((channel) => channel.every(Number.isFinite))).toBe(true);
    },
  );

  it("uses the shared fade when becoming inactive", () => {
    const processor = loadWorkletProcessor(48_000);

    sendWorkletMessage(processor, {
      type: "configure",
      program: createSpectralCathedralWorkletProgram(),
    });
    sendWorkletMessage(processor, { type: "seek", seconds: 0.01 });
    sendWorkletMessage(processor, { type: "active", value: false });
    processor.fade = 1;
    processor.process([], createWorkletOutputs(128));

    expect(processor.fade).toBeCloseTo((1 - 0.0018) ** 128, 12);
  });

  it("reports an unknown program once and renders silence", () => {
    const processor = loadWorkletProcessor(48_000);
    const outputs = createWorkletOutputs(64);

    sendWorkletMessage(processor, {
      type: "configure",
      program: { kind: "unknown-program" },
    });
    sendWorkletMessage(processor, { type: "active", value: true });
    processor.process([], outputs);
    processor.process([], outputs);

    expect(processor.port.postMessage).toHaveBeenCalledTimes(1);
    expect(processor.port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
    expect(outputs.flat().every((channel) => channel.every((sample) => sample === 0))).toBe(true);
  });

  it("rejects non-finite Chapter 2 configuration values", () => {
    const processor = loadWorkletProcessor(48_000);
    const program = createSpectralCathedralWorkletProgram();

    sendWorkletMessage(processor, {
      type: "configure",
      program: { ...program, normalization: Number.NaN },
    });
    processor.process([], createWorkletOutputs(16));

    expect(processor.port.postMessage).toHaveBeenCalledTimes(1);
  });

  it("rejects finite but invalid Chapter 2 synthesis ranges", () => {
    const processor = loadWorkletProcessor(48_000);
    const program = createSpectralCathedralWorkletProgram();

    sendWorkletMessage(processor, {
      type: "configure",
      program: {
        ...program,
        synthesis: {
          ...program.synthesis,
          maximumPartials: 0,
        },
      },
    });
    expect(() => processor.process([], createWorkletOutputs(16))).not.toThrow();

    expect(processor.port.postMessage).toHaveBeenCalledTimes(1);
  });

  it("rejects a dissonant Chapter 3 mode set before processing", () => {
    const processor = loadWorkletProcessor(48_000);
    const program = createMobiusChoirWorkletProgram();
    const events = [...program.score.events];
    events[0] = { ...events[0]!, modeIds: [2, 4] };
    sendWorkletMessage(processor, {
      type: "configure",
      program: {
        ...program,
        score: {
          ...program.score,
          events,
        },
      },
    });
    processor.process([], createWorkletOutputs(16));

    expect(processor.port.postMessage).toHaveBeenCalledTimes(1);
  });

  it("rejects an incomplete Chapter 2 event table", () => {
    const processor = loadWorkletProcessor(48_000);
    const program = createSpectralCathedralWorkletProgram();

    sendWorkletMessage(processor, {
      type: "configure",
      program: {
        ...program,
        score: {
          ...program.score,
          events: program.score.events.slice(0, -1),
        },
      },
    });
    expect(() => processor.process([], createWorkletOutputs(16))).not.toThrow();

    expect(processor.port.postMessage).toHaveBeenCalledTimes(1);
  });

  it("rejects a Residue Bloom program with an empty event table before processing", () => {
    const score = buildMusicalScoreProgram(
      RESIDUE_BLOOM_SCORE_DEFINITION,
      RESIDUE_BLOOM_SERIES,
      55,
      RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
    );
    const processor = loadWorkletProcessor(48_000);
    const program = createResidueBloomAudioProgram(score).worklet;

    sendWorkletMessage(processor, {
      type: "configure",
      program: {
        ...program,
        score: {
          ...score,
          events: [],
        },
      },
    });
    expect(() => processor.process([], createWorkletOutputs(16))).not.toThrow();

    expect(processor.port.postMessage).toHaveBeenCalledTimes(1);
  });

  it("continues to render the Residue Bloom program", () => {
    const score = buildMusicalScoreProgram(
      RESIDUE_BLOOM_SCORE_DEFINITION,
      RESIDUE_BLOOM_SERIES,
      55,
      RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
    );
    const processor = loadWorkletProcessor(48_000);
    const outputs = createWorkletOutputs(256);

    sendWorkletMessage(processor, {
      type: "configure",
      program: createResidueBloomAudioProgram(score).worklet,
    });
    sendWorkletMessage(processor, { type: "seek", seconds: 0.01 });
    sendWorkletMessage(processor, { type: "active", value: true });
    processor.fade = 1;
    processor.process([], outputs);

    expect(outputs[0]![0]!.some((sample) => sample !== 0)).toBe(true);
    expect(outputs.flat().every((channel) => channel.every(Number.isFinite))).toBe(true);
  });

  it.each(
    [44_100, 48_000, 96_000].flatMap((sampleRate) =>
      [0.01, 30.123, 72.001, 143.99, 144.01].map(
        (startTimeSeconds) => [sampleRate, startTimeSeconds] as const,
      ),
    ),
  )(
    "matches the optimized Residue Bloom renderer at %i Hz and %s seconds",
    (sampleRate, startTimeSeconds) => {
      const score = buildMusicalScoreProgram(
        RESIDUE_BLOOM_SCORE_DEFINITION,
        RESIDUE_BLOOM_SERIES,
        55,
        RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
      );
      const frameCount = 128;
      const processor = loadWorkletProcessor(sampleRate);
      const outputs = createWorkletOutputs(frameCount);
      sendWorkletMessage(processor, {
        type: "configure",
        program: createResidueBloomAudioProgram(score).worklet,
      });
      sendWorkletMessage(processor, { type: "seek", seconds: startTimeSeconds });
      sendWorkletMessage(processor, { type: "active", value: true });
      processor.fade = 1;
      processor.process([], outputs);

      const expected = renderResidueBloomStereo({
        score,
        startTimeSeconds: Math.round(startTimeSeconds * sampleRate) / sampleRate,
        durationSeconds: frameCount / sampleRate,
        sampleRate,
      });
      for (let frame = 0; frame < frameCount; frame += 1) {
        expect(Math.abs(outputs[0]![0]![frame]! - expected.left[frame]!)).toBeLessThanOrEqual(1e-6);
        expect(Math.abs(outputs[0]![1]![frame]! - expected.right[frame]!)).toBeLessThanOrEqual(
          1e-6,
        );
      }
    },
  );

  it("keeps representative 128-sample blocks below half of the 48 kHz deadline", () => {
    const residueScore = buildMusicalScoreProgram(
      RESIDUE_BLOOM_SCORE_DEFINITION,
      RESIDUE_BLOOM_SERIES,
      55,
      RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
    );
    const cases = [
      { timeSeconds: 72, program: createResidueBloomAudioProgram(residueScore).worklet },
      { timeSeconds: 50, program: createSpectralCathedralWorkletProgram() },
      { timeSeconds: 42.353, program: createMobiusChoirWorkletProgram() },
      ...createPikoChapterPrograms().map((program) => ({
        timeSeconds: getPikoChapterPerformanceTime(program.kind),
        program,
      })),
    ];
    const sampleRate = 48_000;
    const blockSamples = 128;
    const halfDeadlineMilliseconds = ((blockSamples / sampleRate) * 1_000) / 2;
    const measurements: Array<{ chapter: string; p95Milliseconds: number }> = [];

    for (const { timeSeconds, program } of cases) {
      const processor = loadWorkletProcessor(sampleRate);
      const outputs = createWorkletOutputs(blockSamples);
      sendWorkletMessage(processor, { type: "configure", program });
      sendWorkletMessage(processor, { type: "seek", seconds: timeSeconds });
      sendWorkletMessage(processor, { type: "active", value: true });
      processor.fade = 1;
      for (let block = 0; block < 32; block += 1) processor.process([], outputs);

      const batchAverages: number[] = [];
      for (let batch = 0; batch < 32; batch += 1) {
        const startMilliseconds = performance.now();
        for (let block = 0; block < 16; block += 1) processor.process([], outputs);
        batchAverages.push((performance.now() - startMilliseconds) / 16);
      }
      batchAverages.sort((left, right) => left - right);
      const p95Milliseconds = batchAverages[Math.floor(batchAverages.length * 0.95)]!;
      measurements.push({
        chapter: program.kind,
        p95Milliseconds: Number(p95Milliseconds.toFixed(3)),
      });

      expect(
        p95Milliseconds,
        `${program.kind} p95 block ${p95Milliseconds.toFixed(3)} ms exceeds ${halfDeadlineMilliseconds.toFixed(3)} ms`,
      ).toBeLessThanOrEqual(halfDeadlineMilliseconds);
    }

    if (process.env.FOURIER_GARDEN_REPORT_WORKLET_PERFORMANCE === "1") {
      console.table(measurements);
    }
  });
});
