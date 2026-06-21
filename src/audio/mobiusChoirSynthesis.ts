import { MOBIUS_CHOIR_DEFINITION } from "../math/mobiusChoir";
import type {
  AudioEngineProgram,
  AudioGraphPreset,
  MobiusChoirAudioMode,
  MobiusChoirSynthesisPreset,
  MobiusChoirWorkletProgram,
} from "./audioProgram";
import {
  MOBIUS_CHOIR_SCORE,
  type MobiusChoirGesture,
  type MobiusChoirVowel,
} from "./mobiusChoirScore";
import {
  createMobiusChoirRuntime,
  type MobiusChoirRuntime,
  type MobiusChoirRuntimeEvent,
  type MobiusChoirRuntimeVoice,
} from "./mobiusChoirRuntime";

export interface MobiusChoirPartial {
  partial: number;
  leftFrequencyHz: number;
  rightFrequencyHz: number;
  included: boolean;
}

export interface MobiusChoirStereoSample {
  dryLeft: number;
  dryRight: number;
  wetLeft: number;
  wetRight: number;
}

interface MobiusChoirRenderOptions {
  program: MobiusChoirWorkletProgram;
  startTimeSeconds: number;
  durationSeconds: number;
  sampleRate: number;
}

const LIMITER_CEILING = 10 ** (-1 / 20);

export const MOBIUS_CHOIR_SYNTHESIS = {
  maximumPartials: 6,
  partialDamping: 1.72,
  articulations: {
    breath: {
      attackSeconds: 0.09,
      decaySeconds: 1.5,
      fadeStartSeconds: 1.85,
      endSeconds: 2.05,
      breathGain: 0.05,
    },
    call: {
      attackSeconds: 0.06,
      decaySeconds: 1.35,
      fadeStartSeconds: 1.48,
      endSeconds: 1.7,
      breathGain: 0.03,
    },
    answer: {
      attackSeconds: 0.07,
      decaySeconds: 1.4,
      fadeStartSeconds: 1.62,
      endSeconds: 1.85,
      breathGain: 0.035,
    },
    turn: {
      attackSeconds: 0.055,
      decaySeconds: 1.3,
      fadeStartSeconds: 1.45,
      endSeconds: 1.65,
      breathGain: 0.025,
    },
    braid: {
      attackSeconds: 0.06,
      decaySeconds: 1.45,
      fadeStartSeconds: 1.65,
      endSeconds: 1.9,
      breathGain: 0.025,
    },
    converge: {
      attackSeconds: 0.09,
      decaySeconds: 1.6,
      fadeStartSeconds: 1.95,
      endSeconds: 2.2,
      breathGain: 0.04,
    },
  },
  formants: {
    u: [
      { frequencyHz: 350, bandwidthHz: 100, amplitude: 1 },
      { frequencyHz: 900, bandwidthHz: 140, amplitude: 0.6 },
      { frequencyHz: 2_200, bandwidthHz: 260, amplitude: 0.18 },
    ],
    o: [
      { frequencyHz: 450, bandwidthHz: 110, amplitude: 1 },
      { frequencyHz: 800, bandwidthHz: 130, amplitude: 0.72 },
      { frequencyHz: 2_830, bandwidthHz: 300, amplitude: 0.16 },
    ],
    e: [
      { frequencyHz: 500, bandwidthHz: 110, amplitude: 0.86 },
      { frequencyHz: 1_700, bandwidthHz: 180, amplitude: 1 },
      { frequencyHz: 2_500, bandwidthHz: 300, amplitude: 0.2 },
    ],
    a: [
      { frequencyHz: 800, bandwidthHz: 140, amplitude: 1 },
      { frequencyHz: 1_150, bandwidthHz: 170, amplitude: 0.86 },
      { frequencyHz: 2_900, bandwidthHz: 320, amplitude: 0.18 },
    ],
  },
  formantFloor: 0.1,
  maximumEventSeconds: 2.2,
  breathSeconds: 0.28,
  breathMinimumHz: 1_200,
  breathMaximumHz: 6_500,
  breathComponentCount: 4,
  stereoDetuneRatio: 0.00125,
  antiAliasRatio: 0.9,
  outputGain: 0.551,
} as const satisfies MobiusChoirSynthesisPreset;

export const MOBIUS_CHOIR_AUDIO_GRAPH: AudioGraphPreset = {
  dryHighPassHz: 95,
  dryHighPassQ: 0.45,
  dryHighShelfHz: 4_800,
  dryHighShelfGainDb: -3,
  dryLowPassHz: 8_200,
  dryLowPassQ: 0.3,
  dryGain: 0.9,
  wetHighPassHz: 180,
  wetHighPassQ: 0.45,
  wetGain: 0.2,
  roomSeconds: 2.6,
  roomDecay: 3.8,
  compressor: {
    thresholdDb: -16,
    kneeDb: 12,
    ratio: 3,
    attackSeconds: 0.008,
    releaseSeconds: 0.26,
  },
  limiterCeilingDbfs: -1,
};

export function createMobiusChoirAudioModes(): MobiusChoirAudioMode[] {
  return MOBIUS_CHOIR_DEFINITION.modes.map((mode) => ({
    id: mode.id,
    m: mode.m,
    n: mode.n,
    eigenvalue: mode.eigenvalue,
    coefficient: mode.coefficient,
    voiceKind: mode.voiceKind,
    baseFrequencyHz: 196 * Math.sqrt(mode.eigenvalue),
    normalizedGain: 2 / (1 + mode.eigenvalue),
    modalAngularFrequency: MOBIUS_CHOIR_DEFINITION.waveTimeScale * Math.sqrt(mode.eigenvalue),
  }));
}

export function evaluateMobiusChoirVoicePhases(
  mode: MobiusChoirAudioMode,
  absoluteEventTimeSeconds: number,
): number[] {
  if (!Number.isFinite(absoluteEventTimeSeconds)) {
    throw new Error("Möbius Choir event time must be finite");
  }
  const theta = mode.modalAngularFrequency * absoluteEventTimeSeconds;
  return mode.voiceKind === "single" ? [theta] : [theta, theta - Math.PI / 2];
}

export function getMobiusChoirEnvelope(
  ageSeconds: number,
  gesture: string,
  preset: MobiusChoirSynthesisPreset = MOBIUS_CHOIR_SYNTHESIS,
): number {
  const articulation = preset.articulations[gesture as MobiusChoirGesture];
  if (
    !articulation ||
    !Number.isFinite(ageSeconds) ||
    ageSeconds <= 0 ||
    ageSeconds >= articulation.endSeconds
  ) {
    return 0;
  }
  const body =
    (1 - Math.exp(-ageSeconds / articulation.attackSeconds)) *
    Math.exp(-ageSeconds / articulation.decaySeconds);
  if (ageSeconds < articulation.fadeStartSeconds) return body;
  const progress =
    (ageSeconds - articulation.fadeStartSeconds) /
    (articulation.endSeconds - articulation.fadeStartSeconds);
  return body * 0.5 * (1 + Math.cos(Math.PI * progress));
}

export function getMobiusChoirPartials(
  mode: MobiusChoirAudioMode,
  sampleRate: number,
  registerMultiplier: number,
  preset: MobiusChoirSynthesisPreset = MOBIUS_CHOIR_SYNTHESIS,
): MobiusChoirPartial[] {
  const limit = sampleRate * 0.5 * preset.antiAliasRatio;
  return Array.from({ length: preset.maximumPartials }, (_, index) => {
    const partial = index + 1;
    const leftFrequencyHz =
      mode.baseFrequencyHz * registerMultiplier * partial * (1 - preset.stereoDetuneRatio);
    const rightFrequencyHz =
      mode.baseFrequencyHz * registerMultiplier * partial * (1 + preset.stereoDetuneRatio);
    return {
      partial,
      leftFrequencyHz,
      rightFrequencyHz,
      included: Math.max(leftFrequencyHz, rightFrequencyHz) < limit,
    };
  });
}

function smoothstep01(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

export function getMobiusChoirAbsoluteCarrierPhase(
  frequencyHz: number,
  partial: number,
  modalAngularFrequency: number,
  voicePhaseOffset: number,
  absoluteTimeSeconds: number,
): number {
  return (
    Math.PI * 2 * frequencyHz * absoluteTimeSeconds +
    partial * (modalAngularFrequency * absoluteTimeSeconds + voicePhaseOffset)
  );
}

export function getMobiusChoirContinuousAmplitude(phase: number, depth: number): number {
  return 1 - depth / 2 + depth * Math.abs(Math.cos(phase));
}

export function getMobiusChoirContinuousBrightness(
  phase: number,
  depth: number,
  partialPosition: number,
): number {
  return 1 + depth * (Math.abs(Math.sin(phase)) - 0.5) * partialPosition;
}

export function getMobiusChoirContinuousPan(
  basePan: number,
  phase: number,
  panMotion: number,
): number {
  return Math.min(1, Math.max(-1, basePan + Math.sin(phase) * panMotion));
}

function getEqualPowerPanGains(pan: number): readonly [number, number] {
  return [Math.sqrt((1 - pan) / 2), Math.sqrt((1 + pan) / 2)];
}

function getFormantWeight(
  vowel: MobiusChoirVowel,
  frequencyHz: number,
  preset: MobiusChoirSynthesisPreset,
): number {
  return preset.formants[vowel].reduce((sum, band) => {
    const normalized = (frequencyHz - band.frequencyHz) / band.bandwidthHz;
    return sum + band.amplitude * Math.exp(-0.5 * normalized * normalized);
  }, preset.formantFloor);
}

function renderRuntimeBreath(
  voice: MobiusChoirRuntimeVoice,
  ageSeconds: number,
  preset: MobiusChoirSynthesisPreset,
): number {
  if (ageSeconds <= 0 || ageSeconds >= preset.breathSeconds || voice.breathNormalization <= 0) {
    return 0;
  }
  let value = 0;
  for (const component of voice.breath) {
    value +=
      component.weight *
      Math.sin(Math.PI * 2 * component.frequencyHz * ageSeconds + component.phase);
  }
  const envelope = Math.sin((Math.PI * ageSeconds) / preset.breathSeconds) ** 2;
  return (value / voice.breathNormalization) * envelope;
}

function findLatestRuntimeEventIndex(
  events: readonly MobiusChoirRuntimeEvent[],
  localTimeSeconds: number,
): number {
  let low = 0;
  let high = events.length - 1;
  let latest = -1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (events[middle]!.localTimeSeconds <= localTimeSeconds) {
      latest = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return latest;
}

const runtimeCache = new WeakMap<MobiusChoirWorkletProgram, Map<number, MobiusChoirRuntime>>();

function getCachedRuntime(
  program: MobiusChoirWorkletProgram,
  sampleRate: number,
): MobiusChoirRuntime {
  let bySampleRate = runtimeCache.get(program);
  if (!bySampleRate) {
    bySampleRate = new Map();
    runtimeCache.set(program, bySampleRate);
  }
  let runtime = bySampleRate.get(sampleRate);
  if (!runtime) {
    runtime = createMobiusChoirRuntime(program, sampleRate);
    bySampleRate.set(sampleRate, runtime);
  }
  return runtime;
}

export function getMobiusChoirNormalization(
  modes: readonly MobiusChoirAudioMode[],
  preset: MobiusChoirSynthesisPreset,
): number {
  const modesById = new Map(modes.map((mode) => [mode.id, mode]));
  return Math.max(
    ...MOBIUS_CHOIR_SCORE.events.map(
      (event) =>
        event.modeIds.reduce((eventSum, modeId) => {
          const mode = modesById.get(modeId);
          if (!mode) return eventSum;
          let spectralSum = 0;
          for (
            let partial = 1;
            partial <= Math.min(preset.maximumPartials, event.partialCount);
            partial += 1
          ) {
            const frequencyHz = mode.baseFrequencyHz * event.registerMultiplier * partial;
            const formantWeight = Math.max(
              getFormantWeight(event.vowelStart, frequencyHz, preset),
              getFormantWeight(event.vowelEnd, frequencyHz, preset),
            );
            spectralSum += partial ** -preset.partialDamping * formantWeight;
          }
          const voiceCount = mode.voiceKind === "single" ? 1 : 2;
          return eventSum + mode.normalizedGain * voiceCount * spectralSum;
        }, 0) * event.baseGain,
    ),
  );
}

export function createMobiusChoirWorkletProgram(): MobiusChoirWorkletProgram {
  const modes = createMobiusChoirAudioModes();
  const program: MobiusChoirWorkletProgram = {
    kind: "mobius-choir",
    score: MOBIUS_CHOIR_SCORE,
    modes,
    synthesis: MOBIUS_CHOIR_SYNTHESIS,
    normalization: getMobiusChoirNormalization(modes, MOBIUS_CHOIR_SYNTHESIS),
  };
  validateMobiusChoirWorkletProgram(program);
  return program;
}

export function createMobiusChoirAudioProgram(): AudioEngineProgram {
  return { worklet: createMobiusChoirWorkletProgram(), graph: MOBIUS_CHOIR_AUDIO_GRAPH };
}

export function validateMobiusChoirWorkletProgram(program: MobiusChoirWorkletProgram): void {
  if (program.kind !== "mobius-choir") throw new Error("Möbius Choir program kind is invalid");
  if (program.modes.length !== 6) throw new Error("Möbius Choir program must contain 6 modes");
  if (program.score.events.length !== 63) {
    throw new Error("Möbius Choir program must contain 63 events");
  }
  if (Math.abs(program.score.cycleSeconds - 960 / 17) > 1e-12) {
    throw new Error("Möbius Choir cycle is invalid");
  }
  const modeIds = new Set(program.modes.map((mode) => mode.id));
  const allowedModeSets = new Set(["1", "2", "3", "4", "5", "6", "1,4", "2,3", "5,6"]);
  if (modeIds.size !== 6) throw new Error("Möbius Choir mode IDs must be unique");
  for (const mode of program.modes) {
    for (const value of [
      mode.m,
      mode.n,
      mode.eigenvalue,
      mode.coefficient,
      mode.baseFrequencyHz,
      mode.normalizedGain,
      mode.modalAngularFrequency,
    ]) {
      if (!Number.isFinite(value)) throw new Error("Möbius Choir mode values must be finite");
    }
    if ((mode.n === 0) !== (mode.voiceKind === "single")) {
      throw new Error("Möbius Choir n=0 modes must be single voices");
    }
  }
  for (const event of program.score.events) {
    if (
      !Number.isInteger(event.index) ||
      event.localTimeSeconds < 0 ||
      event.localTimeSeconds >= program.score.cycleSeconds ||
      event.modeIds.length === 0 ||
      event.modeIds.some((modeId) => !modeIds.has(modeId))
    ) {
      throw new Error("Möbius Choir event is invalid");
    }
    if (!allowedModeSets.has(event.modeIds.join(","))) {
      throw new Error("Möbius Choir event mode set is invalid");
    }
    if (
      !Number.isInteger(event.partialCount) ||
      event.partialCount < 1 ||
      event.partialCount > program.synthesis.maximumPartials ||
      ![event.amplitudeMotionDepth, event.brightnessMotionDepth, event.panMotion].every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 1,
      ) ||
      ![1, 4 / 3, 3 / 2].includes(event.registerMultiplier)
    ) {
      throw new Error("Möbius Choir event expression is invalid");
    }
  }
  if (program.synthesis.maximumPartials !== 6) {
    throw new Error("Möbius Choir synthesis must contain at most 6 partials");
  }
  if (!Number.isFinite(program.normalization) || program.normalization <= 0) {
    throw new Error("Möbius Choir normalization must be positive and finite");
  }
}

export function renderMobiusChoirSample(
  program: MobiusChoirWorkletProgram,
  absoluteTimeSeconds: number,
  sampleRate: number,
): MobiusChoirStereoSample {
  const runtime = getCachedRuntime(program, sampleRate);
  const currentCycleIndex = Math.floor(absoluteTimeSeconds / runtime.cycleSeconds);
  const currentCycleStart = currentCycleIndex * runtime.cycleSeconds;
  const localTimeSeconds = absoluteTimeSeconds - currentCycleStart;
  let dryLeft = 0;
  let dryRight = 0;
  let wetLeft = 0;
  let wetRight = 0;

  function renderEvent(event: MobiusChoirRuntimeEvent, absoluteEventTimeSeconds: number): void {
    const ageSeconds = absoluteTimeSeconds - absoluteEventTimeSeconds;
    const envelope = getMobiusChoirEnvelope(ageSeconds, event.gesture, program.synthesis);
    if (envelope <= 0) return;
    const vowelProgress = smoothstep01(ageSeconds / event.fadeStartSeconds);
    let eventLeft = 0;
    let eventRight = 0;

    for (const voice of event.voices) {
      const controlPhase =
        voice.controlPhaseOffset - voice.modalAngularFrequency * absoluteTimeSeconds;
      const amplitude = getMobiusChoirContinuousAmplitude(controlPhase, event.amplitudeMotionDepth);
      const pan = getMobiusChoirContinuousPan(voice.basePan, controlPhase, event.panMotion);
      const [panLeft, panRight] = getEqualPowerPanGains(pan);
      let voiceLeft = 0;
      let voiceRight = 0;
      for (const partial of voice.partials) {
        const partialPosition = (partial.partial - 1) / Math.max(1, event.partialCount - 1);
        const brightness = getMobiusChoirContinuousBrightness(
          controlPhase,
          event.brightnessMotionDepth,
          partialPosition,
        );
        const weight =
          partial.baseWeight *
          (partial.startWeight + (partial.endWeight - partial.startWeight) * vowelProgress) *
          brightness;
        voiceLeft +=
          weight *
          Math.cos(
            getMobiusChoirAbsoluteCarrierPhase(
              partial.leftFrequencyHz,
              partial.partial,
              voice.modalAngularFrequency,
              voice.phaseOffset,
              absoluteTimeSeconds,
            ),
          );
        voiceRight +=
          weight *
          Math.cos(
            getMobiusChoirAbsoluteCarrierPhase(
              partial.rightFrequencyHz,
              partial.partial,
              voice.modalAngularFrequency,
              voice.phaseOffset,
              absoluteTimeSeconds,
            ),
          );
      }
      const breath = event.breathGain * renderRuntimeBreath(voice, ageSeconds, program.synthesis);
      eventLeft += voice.normalizedGain * panLeft * (voiceLeft * envelope * amplitude + breath);
      eventRight += voice.normalizedGain * panRight * (voiceRight * envelope * amplitude + breath);
    }

    const scale = (runtime.outputGain * event.baseGain) / runtime.normalization;
    dryLeft += eventLeft * scale;
    dryRight += eventRight * scale;
    wetLeft += eventLeft * scale * event.wetSend;
    wetRight += eventRight * scale * event.wetSend;
  }

  const latestIndex = findLatestRuntimeEventIndex(runtime.events, localTimeSeconds);
  for (let index = latestIndex; index >= 0; index -= 1) {
    const event = runtime.events[index]!;
    const absoluteEventTimeSeconds = currentCycleStart + event.localTimeSeconds;
    if (absoluteTimeSeconds - absoluteEventTimeSeconds >= runtime.maximumEventSeconds) break;
    renderEvent(event, absoluteEventTimeSeconds);
  }
  if (currentCycleIndex > 0 && localTimeSeconds < runtime.maximumEventSeconds) {
    const previousCycleStart = currentCycleStart - runtime.cycleSeconds;
    for (let index = runtime.events.length - 1; index >= 0; index -= 1) {
      const event = runtime.events[index]!;
      const absoluteEventTimeSeconds = previousCycleStart + event.localTimeSeconds;
      if (absoluteTimeSeconds - absoluteEventTimeSeconds >= runtime.maximumEventSeconds) break;
      renderEvent(event, absoluteEventTimeSeconds);
    }
  }

  return {
    dryLeft: Math.max(-LIMITER_CEILING, Math.min(LIMITER_CEILING, dryLeft)),
    dryRight: Math.max(-LIMITER_CEILING, Math.min(LIMITER_CEILING, dryRight)),
    wetLeft: Math.max(-LIMITER_CEILING, Math.min(LIMITER_CEILING, wetLeft)),
    wetRight: Math.max(-LIMITER_CEILING, Math.min(LIMITER_CEILING, wetRight)),
  };
}

export function renderMobiusChoirStereo({
  program,
  startTimeSeconds,
  durationSeconds,
  sampleRate,
}: MobiusChoirRenderOptions): { left: Float32Array; right: Float32Array } {
  const sampleCount = Math.floor(durationSeconds * sampleRate);
  const left = new Float32Array(sampleCount);
  const right = new Float32Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = renderMobiusChoirSample(
      program,
      startTimeSeconds + index / sampleRate,
      sampleRate,
    );
    left[index] = sample.dryLeft;
    right[index] = sample.dryRight;
  }
  return { left, right };
}
