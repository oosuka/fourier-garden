import { MOBIUS_CHOIR_DEFINITION } from "../math/model";
import type { AudioEngineProgram, AudioGraphPreset } from "../../../audio/audioProgram";
import {
  MOBIUS_CHOIR_SCORE,
  type MobiusChoirGesture,
  type MobiusChoirScoreProgram,
  type MobiusChoirVowel,
} from "./score";
import {
  createMobiusChoirRuntime,
  type MobiusChoirRuntime,
  type MobiusChoirRuntimeEvent,
  type MobiusChoirRuntimeVoice,
} from "./runtime";

export interface MobiusChoirAudioMode {
  id: number;
  m: number;
  n: number;
  eigenvalue: number;
  coefficient: number;
  baseFrequencyHz: number;
  normalizedGain: number;
  modalAngularFrequency: number;
  voiceKind: "single" | "quadrature-pair";
}

export interface MobiusChoirArticulationPreset {
  attackSeconds: number;
  decaySeconds: number;
  fadeStartSeconds: number;
  endSeconds: number;
  breathGain: number;
  moraOffsetsSeconds: readonly number[];
  moraGains: readonly number[];
}

export interface MobiusChoirFormantBand {
  frequencyHz: number;
  bandwidthHz: number;
  amplitude: number;
}

export interface MobiusChoirSynthesisPreset {
  maximumPartials: number;
  partialDamping: number;
  articulations: Readonly<Record<MobiusChoirGesture, MobiusChoirArticulationPreset>>;
  formants: Readonly<Record<MobiusChoirVowel, readonly MobiusChoirFormantBand[]>>;
  formantFloor: number;
  maximumEventSeconds: number;
  breathSeconds: number;
  breathMinimumHz: number;
  breathMaximumHz: number;
  breathComponentCount: number;
  stereoDetuneRatio: number;
  antiAliasRatio: number;
  outputGain: number;
}

export interface MobiusChoirWorkletProgram {
  kind: "mobius-choir";
  score: MobiusChoirScoreProgram;
  modes: readonly MobiusChoirAudioMode[];
  synthesis: MobiusChoirSynthesisPreset;
  normalization: number;
}

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
const MOBIUS_CHOIR_NORMALIZATION_COMPENSATION = 0.86;

export const MOBIUS_CHOIR_SYNTHESIS = {
  maximumPartials: 1,
  partialDamping: 8,
  articulations: {
    breath: {
      attackSeconds: 0.01,
      decaySeconds: 0.062,
      fadeStartSeconds: 0.17,
      endSeconds: 0.205,
      breathGain: 0,
      moraOffsetsSeconds: [0],
      moraGains: [0.82],
    },
    call: {
      attackSeconds: 0.008,
      decaySeconds: 0.058,
      fadeStartSeconds: 0.16,
      endSeconds: 0.195,
      breathGain: 0,
      moraOffsetsSeconds: [0],
      moraGains: [1],
    },
    answer: {
      attackSeconds: 0.008,
      decaySeconds: 0.06,
      fadeStartSeconds: 0.164,
      endSeconds: 0.2,
      breathGain: 0,
      moraOffsetsSeconds: [0],
      moraGains: [0.94],
    },
    turn: {
      attackSeconds: 0.006,
      decaySeconds: 0.056,
      fadeStartSeconds: 0.156,
      endSeconds: 0.19,
      breathGain: 0,
      moraOffsetsSeconds: [0],
      moraGains: [1],
    },
    braid: {
      attackSeconds: 0.006,
      decaySeconds: 0.056,
      fadeStartSeconds: 0.158,
      endSeconds: 0.192,
      breathGain: 0,
      moraOffsetsSeconds: [0],
      moraGains: [0.98],
    },
    converge: {
      attackSeconds: 0.011,
      decaySeconds: 0.066,
      fadeStartSeconds: 0.176,
      endSeconds: 0.21,
      breathGain: 0,
      moraOffsetsSeconds: [0],
      moraGains: [0.84],
    },
  },
  formants: {
    u: [
      { frequencyHz: 520, bandwidthHz: 600, amplitude: 0 },
      { frequencyHz: 760, bandwidthHz: 600, amplitude: 0 },
      { frequencyHz: 980, bandwidthHz: 600, amplitude: 0 },
    ],
    o: [
      { frequencyHz: 520, bandwidthHz: 600, amplitude: 0 },
      { frequencyHz: 760, bandwidthHz: 600, amplitude: 0 },
      { frequencyHz: 980, bandwidthHz: 600, amplitude: 0 },
    ],
    e: [
      { frequencyHz: 520, bandwidthHz: 600, amplitude: 0 },
      { frequencyHz: 760, bandwidthHz: 600, amplitude: 0 },
      { frequencyHz: 980, bandwidthHz: 600, amplitude: 0 },
    ],
    a: [
      { frequencyHz: 520, bandwidthHz: 600, amplitude: 0 },
      { frequencyHz: 760, bandwidthHz: 600, amplitude: 0 },
      { frequencyHz: 980, bandwidthHz: 600, amplitude: 0 },
    ],
  },
  formantFloor: 1,
  maximumEventSeconds: 0.23,
  breathSeconds: 0.04,
  breathMinimumHz: 420,
  breathMaximumHz: 920,
  breathComponentCount: 1,
  stereoDetuneRatio: 0.00125,
  antiAliasRatio: 0.9,
  outputGain: 0.36,
} as const satisfies MobiusChoirSynthesisPreset;

export const MOBIUS_CHOIR_AUDIO_GRAPH: AudioGraphPreset = {
  dryHighPassHz: 220,
  dryHighPassQ: 0.45,
  dryHighShelfHz: 1_000,
  dryHighShelfGainDb: -24,
  dryLowPassHz: 1_080,
  dryLowPassQ: 0.25,
  dryGain: 0.88,
  wetHighPassHz: 220,
  wetHighPassQ: 0.45,
  wetLowPassHz: 860,
  wetLowPassQ: 0.25,
  wetGain: 0.075,
  roomSeconds: 1.15,
  roomDecay: 2.35,
  compressor: {
    thresholdDb: -16,
    kneeDb: 12,
    ratio: 3,
    attackSeconds: 0.008,
    releaseSeconds: 0.2,
  },
  limiterCeilingDbfs: -1,
};

export function createMobiusChoirAudioModes(): MobiusChoirAudioMode[] {
  const roots = MOBIUS_CHOIR_DEFINITION.modes.map((mode) => Math.sqrt(mode.eigenvalue));
  const minimumRoot = Math.min(...roots);
  const maximumRoot = Math.max(...roots);
  return MOBIUS_CHOIR_DEFINITION.modes.map((mode) => ({
    id: mode.id,
    m: mode.m,
    n: mode.n,
    eigenvalue: mode.eigenvalue,
    coefficient: mode.coefficient,
    voiceKind: mode.voiceKind,
    baseFrequencyHz:
      420 +
      ((Math.sqrt(mode.eigenvalue) - minimumRoot) / (maximumRoot - minimumRoot)) * (920 - 420),
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

function getMobiusLowCutWeight(frequencyHz: number): number {
  const ratio = Math.max(0, frequencyHz) / 360;
  const squared = ratio * ratio;
  return squared / Math.sqrt(1 + squared * squared);
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

function getMobiusContinuityEnvelope(ageSeconds: number, maximumEventSeconds: number): number {
  if (ageSeconds <= 0 || ageSeconds >= maximumEventSeconds) return 0;
  const progress = ageSeconds / maximumEventSeconds;
  return Math.sin(Math.PI * progress) ** 2 * Math.exp(-ageSeconds * 0.22);
}

function renderRuntimeAir(voice: MobiusChoirRuntimeVoice, absoluteTimeSeconds: number): number {
  if (voice.breathNormalization <= 0) return 0;
  let value = 0;
  for (const component of voice.breath) {
    value +=
      component.weight *
      Math.sin(Math.PI * 2 * component.frequencyHz * absoluteTimeSeconds + component.phase);
  }
  return value / voice.breathNormalization;
}

function getMobiusChoirRuntimeEnvelope(
  ageSeconds: number,
  attackSeconds: number,
  decaySeconds: number,
  fadeStartSeconds: number,
  endSeconds: number,
): number {
  if (!Number.isFinite(ageSeconds) || ageSeconds <= 0 || ageSeconds >= endSeconds) return 0;
  const body = (1 - Math.exp(-ageSeconds / attackSeconds)) * Math.exp(-ageSeconds / decaySeconds);
  if (ageSeconds < fadeStartSeconds) return body;
  const progress = (ageSeconds - fadeStartSeconds) / (endSeconds - fadeStartSeconds);
  return body * 0.5 * (1 + Math.cos(Math.PI * progress));
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
  return (
    Math.max(
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
              spectralSum +=
                partial ** -preset.partialDamping *
                formantWeight *
                getMobiusLowCutWeight(frequencyHz);
            }
            const voiceCount = mode.voiceKind === "single" ? 1 : 2;
            return eventSum + mode.normalizedGain * voiceCount * spectralSum;
          }, 0) * event.baseGain,
      ),
    ) * MOBIUS_CHOIR_NORMALIZATION_COMPENSATION
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

export function createMobiusChoirAudioProgram(): AudioEngineProgram<MobiusChoirWorkletProgram> {
  return { worklet: createMobiusChoirWorkletProgram(), graph: MOBIUS_CHOIR_AUDIO_GRAPH };
}

export function validateMobiusChoirWorkletProgram(program: MobiusChoirWorkletProgram): void {
  if (program.kind !== "mobius-choir") throw new Error("Möbius Choir program kind is invalid");
  if (program.modes.length !== 6) throw new Error("Möbius Choir program must contain 6 modes");
  if (program.score.events.length !== 256) {
    throw new Error("Möbius Choir program must contain 256 events");
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
      event.partialCount > 1 ||
      ![event.amplitudeMotionDepth, event.brightnessMotionDepth, event.panMotion].every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 1,
      ) ||
      event.registerMultiplier !== 1
    ) {
      throw new Error("Möbius Choir event expression is invalid");
    }
  }
  if (
    !Number.isInteger(program.synthesis.maximumPartials) ||
    program.synthesis.maximumPartials < 1 ||
    program.synthesis.maximumPartials > 1
  ) {
    throw new Error("Möbius Choir piko synthesis must contain exactly 1 partial");
  }
  for (const articulation of Object.values(program.synthesis.articulations)) {
    if (
      !Array.isArray(articulation.moraOffsetsSeconds) ||
      !Array.isArray(articulation.moraGains) ||
      articulation.moraOffsetsSeconds.length === 0 ||
      articulation.moraOffsetsSeconds.length !== articulation.moraGains.length ||
      articulation.moraOffsetsSeconds[0] !== 0 ||
      articulation.moraOffsetsSeconds.some(
        (offsetSeconds) =>
          !Number.isFinite(offsetSeconds) ||
          offsetSeconds < 0 ||
          offsetSeconds >= articulation.endSeconds,
      ) ||
      articulation.moraGains.some((gain) => !Number.isFinite(gain) || gain <= 0 || gain > 1)
    ) {
      throw new Error("Möbius Choir articulation mora ranges are invalid");
    }
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
    if (ageSeconds <= 0 || ageSeconds >= runtime.maximumEventSeconds) return;
    let eventLeft = 0;
    let eventRight = 0;

    for (const mora of event.mora) {
      const moraAgeSeconds = ageSeconds - mora.offsetSeconds;
      const envelope =
        getMobiusChoirRuntimeEnvelope(
          moraAgeSeconds,
          event.attackSeconds,
          event.decaySeconds,
          event.fadeStartSeconds,
          event.endSeconds,
        ) * mora.gain;
      if (envelope <= 0) continue;
      const vowelProgress = smoothstep01(moraAgeSeconds / event.fadeStartSeconds);

      for (const voice of event.voices) {
        const controlPhase =
          voice.controlPhaseOffset - voice.modalAngularFrequency * absoluteTimeSeconds;
        const amplitude = getMobiusChoirContinuousAmplitude(
          controlPhase,
          event.amplitudeMotionDepth,
        );
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
        const breath =
          event.breathGain *
          mora.gain *
          renderRuntimeBreath(voice, moraAgeSeconds, program.synthesis);
        eventLeft += voice.normalizedGain * panLeft * (voiceLeft * envelope * amplitude + breath);
        eventRight +=
          voice.normalizedGain * panRight * (voiceRight * envelope * amplitude + breath);
      }
    }

    const airEnvelope =
      getMobiusContinuityEnvelope(ageSeconds, runtime.maximumEventSeconds) *
      event.breathGain *
      0.035;
    if (airEnvelope > 0) {
      for (const voice of event.voices) {
        const air = renderRuntimeAir(voice, absoluteTimeSeconds);
        eventLeft += voice.normalizedGain * voice.panLeft * air * airEnvelope;
        eventRight += voice.normalizedGain * voice.panRight * air * airEnvelope;
      }
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
