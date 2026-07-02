import { SPECTRAL_CATHEDRAL_DEFINITION } from "../math/model";
import type { AudioEngineProgram, AudioGraphPreset } from "../../../audio/audioProgram";
import {
  SPECTRAL_CATHEDRAL_SCORE,
  type SpectralCathedralGesture,
  type SpectralCathedralScoreProgram,
} from "./score";
import {
  createSpectralCathedralRuntime,
  type SpectralCathedralRuntime,
  type SpectralCathedralRuntimeEvent,
  type SpectralCathedralRuntimeVoice,
} from "./runtime";

export interface SpectralCathedralAudioMode {
  id: number;
  eigenvalue: number;
  coefficient: number;
  baseFrequencyHz: number;
  normalizedGain: number;
  modalAngularFrequency: number;
  coefficientPhaseOffset: number;
}

export interface SpectralCathedralArticulationPreset {
  attackSeconds: number;
  decaySeconds: number;
  fadeStartSeconds: number;
  endSeconds: number;
  woodAttackGain: number;
  subgrainOffsetsSeconds: readonly number[];
  subgrainGains: readonly number[];
}

export interface SpectralCathedralSynthesisPreset {
  maximumPartials: number;
  partialDamping: number;
  articulations: Readonly<Record<SpectralCathedralGesture, SpectralCathedralArticulationPreset>>;
  maximumEventSeconds: number;
  woodAttackSeconds: number;
  woodMinimumHz: number;
  woodMaximumHz: number;
  woodComponentCount: number;
  stereoDetuneRatio: number;
  antiAliasRatio: number;
  outputGain: number;
}

export interface SpectralCathedralWorkletProgram {
  kind: "spectral-cathedral";
  score: SpectralCathedralScoreProgram;
  modes: readonly SpectralCathedralAudioMode[];
  synthesis: SpectralCathedralSynthesisPreset;
  normalization: number;
}

export interface SpectralCathedralPartial {
  partial: number;
  weight: number;
  leftFrequencyHz: number;
  rightFrequencyHz: number;
  included: boolean;
}

export interface SpectralCathedralStereoSample {
  dryLeft: number;
  dryRight: number;
  wetLeft: number;
  wetRight: number;
}

export interface SpectralCathedralWoodComponent {
  frequencyHz: number;
  phaseRadians: number;
  weight: number;
}

interface SpectralCathedralRenderOptions {
  program: SpectralCathedralWorkletProgram;
  startTimeSeconds: number;
  durationSeconds: number;
  sampleRate: number;
}

export const SPECTRAL_CATHEDRAL_SYNTHESIS = {
  maximumPartials: 1,
  partialDamping: 8,
  articulations: {
    toll: {
      attackSeconds: 0.008,
      decaySeconds: 0.048,
      fadeStartSeconds: 0.122,
      endSeconds: 0.15,
      woodAttackGain: 0,
      subgrainOffsetsSeconds: [0],
      subgrainGains: [0.86],
    },
    answer: {
      attackSeconds: 0.008,
      decaySeconds: 0.05,
      fadeStartSeconds: 0.122,
      endSeconds: 0.15,
      woodAttackGain: 0,
      subgrainOffsetsSeconds: [0],
      subgrainGains: [0.92],
    },
    cascade: {
      attackSeconds: 0.006,
      decaySeconds: 0.046,
      fadeStartSeconds: 0.116,
      endSeconds: 0.145,
      woodAttackGain: 0,
      subgrainOffsetsSeconds: [0],
      subgrainGains: [1],
    },
    pulse: {
      attackSeconds: 0.006,
      decaySeconds: 0.044,
      fadeStartSeconds: 0.112,
      endSeconds: 0.14,
      woodAttackGain: 0,
      subgrainOffsetsSeconds: [0],
      subgrainGains: [1],
    },
    choir: {
      attackSeconds: 0.009,
      decaySeconds: 0.052,
      fadeStartSeconds: 0.126,
      endSeconds: 0.155,
      woodAttackGain: 0,
      subgrainOffsetsSeconds: [0],
      subgrainGains: [0.8],
    },
  },
  maximumEventSeconds: 0.16,
  woodAttackSeconds: 0.04,
  woodMinimumHz: 420,
  woodMaximumHz: 980,
  woodComponentCount: 1,
  stereoDetuneRatio: 0.00125,
  antiAliasRatio: 0.9,
  outputGain: 0.56,
} as const satisfies SpectralCathedralSynthesisPreset;

export const SPECTRAL_CATHEDRAL_AUDIO_GRAPH: AudioGraphPreset = {
  dryHighPassHz: 220,
  dryHighPassQ: 0.45,
  dryHighShelfHz: 1_200,
  dryHighShelfGainDb: -18,
  dryLowPassHz: 1_300,
  dryLowPassQ: 0.25,
  dryGain: 0.92,
  wetHighPassHz: 220,
  wetHighPassQ: 0.45,
  wetLowPassHz: 1_050,
  wetLowPassQ: 0.25,
  wetGain: 0.02,
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
};

export function createSpectralCathedralAudioModes(): SpectralCathedralAudioMode[] {
  const maximumCoefficient = Math.max(
    ...SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) => Math.abs(mode.coefficient)),
  );
  const squareRootEigenvalues = SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) =>
    Math.sqrt(mode.eigenvalue),
  );
  const minimumRoot = Math.min(...squareRootEigenvalues);
  const maximumRoot = Math.max(...squareRootEigenvalues);

  return SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) => ({
    id: mode.id,
    eigenvalue: mode.eigenvalue,
    coefficient: mode.coefficient,
    baseFrequencyHz:
      420 +
      ((Math.sqrt(mode.eigenvalue) - minimumRoot) / (maximumRoot - minimumRoot)) * (980 - 420),
    normalizedGain: Math.abs(mode.coefficient) / maximumCoefficient,
    modalAngularFrequency: SPECTRAL_CATHEDRAL_DEFINITION.waveSpeed * Math.sqrt(mode.eigenvalue),
    coefficientPhaseOffset: mode.coefficient < 0 ? Math.PI : 0,
  }));
}

export function getSpectralCathedralPartials(
  mode: SpectralCathedralAudioMode,
  sampleRate: number,
  preset: SpectralCathedralSynthesisPreset,
  registerMultiplier = 1,
): SpectralCathedralPartial[] {
  const frequencyLimitHz = sampleRate * 0.5 * preset.antiAliasRatio;

  return Array.from({ length: preset.maximumPartials }, (_, index) => {
    const partial = index + 1;
    const leftFrequencyHz =
      mode.baseFrequencyHz * registerMultiplier * partial * (1 - preset.stereoDetuneRatio);
    const rightFrequencyHz =
      mode.baseFrequencyHz * registerMultiplier * partial * (1 + preset.stereoDetuneRatio);

    return {
      partial,
      weight: partial ** -preset.partialDamping,
      leftFrequencyHz,
      rightFrequencyHz,
      included: Math.max(leftFrequencyHz, rightFrequencyHz) < frequencyLimitHz,
    };
  });
}

export function getEqualPowerPanGains(pan: number): readonly [number, number] {
  const clampedPan = Math.max(-1, Math.min(1, pan));
  return [Math.sqrt((1 - clampedPan) / 2), Math.sqrt((1 + clampedPan) / 2)];
}

export function getSpectralCathedralBellEnvelope(
  ageSeconds: number,
  gesture: SpectralCathedralGesture,
  preset: SpectralCathedralSynthesisPreset = SPECTRAL_CATHEDRAL_SYNTHESIS,
  decayScale = 1,
): number {
  const articulation = preset.articulations[gesture];
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || ageSeconds >= articulation.endSeconds) {
    return 0;
  }

  const body =
    (1 - Math.exp(-ageSeconds / articulation.attackSeconds)) *
    Math.exp(-ageSeconds / (articulation.decaySeconds * decayScale));
  if (ageSeconds < articulation.fadeStartSeconds) return body;

  const fadeProgress =
    (ageSeconds - articulation.fadeStartSeconds) /
    (articulation.endSeconds - articulation.fadeStartSeconds);
  return body * 0.5 * (1 + Math.cos(Math.PI * fadeProgress));
}

export function evaluateSpectralCathedralModeExpression(
  mode: SpectralCathedralAudioMode,
  absoluteEventTimeSeconds: number,
): Readonly<{ displacement: number; velocity: number }> {
  const phase = mode.modalAngularFrequency * absoluteEventTimeSeconds;
  return {
    displacement: Math.abs(Math.cos(phase)),
    velocity: Math.abs(Math.sin(phase)),
  };
}

function hashUint32(value: number): number {
  let hash = value >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function hashUnit(
  absoluteEventIndex: number,
  modeId: number,
  component: number,
  salt: number,
): number {
  const seed =
    Math.imul(absoluteEventIndex + 1, 0x9e3779b1) ^
    Math.imul(modeId + 1, 0x85ebca6b) ^
    Math.imul(component + 1, 0xc2b2ae35) ^
    salt;
  return hashUint32(seed) / 0x1_0000_0000;
}

export function getSpectralCathedralWoodComponent(
  absoluteEventIndex: number,
  modeId: number,
  component: number,
  preset: SpectralCathedralSynthesisPreset = SPECTRAL_CATHEDRAL_SYNTHESIS,
): SpectralCathedralWoodComponent {
  if (!Number.isInteger(component) || component < 0 || component >= preset.woodComponentCount) {
    throw new RangeError("Spectral Cathedral wood component index is out of range");
  }

  const frequencyUnit = hashUnit(absoluteEventIndex, modeId, component, 0x68bc21eb);
  const phaseUnit = hashUnit(absoluteEventIndex, modeId, component, 0x02e5be93);
  return {
    frequencyHz:
      preset.woodMinimumHz + (preset.woodMaximumHz - preset.woodMinimumHz) * frequencyUnit,
    phaseRadians: Math.PI * 2 * phaseUnit,
    weight: 1 / Math.sqrt(component + 1),
  };
}

export function getSpectralCathedralWoodAttack(
  absoluteEventIndex: number,
  modeId: number,
  ageSeconds: number,
  preset: SpectralCathedralSynthesisPreset = SPECTRAL_CATHEDRAL_SYNTHESIS,
): number {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || ageSeconds >= preset.woodAttackSeconds) {
    return 0;
  }

  let value = 0;
  let normalization = 0;

  for (let component = 0; component < preset.woodComponentCount; component += 1) {
    const wood = getSpectralCathedralWoodComponent(absoluteEventIndex, modeId, component, preset);
    value +=
      wood.weight * Math.sin(Math.PI * 2 * wood.frequencyHz * ageSeconds + wood.phaseRadians);
    normalization += wood.weight;
  }

  const envelope = Math.sin((Math.PI * ageSeconds) / preset.woodAttackSeconds) ** 2;
  return normalization > 0 ? (value / normalization) * envelope : 0;
}

export function getSpectralCathedralNormalization(
  modes: readonly SpectralCathedralAudioMode[],
  preset: SpectralCathedralSynthesisPreset,
): number {
  const partialWeightSum = Array.from(
    { length: preset.maximumPartials },
    (_, index) => (index + 1) ** -preset.partialDamping,
  ).reduce((sum, weight) => sum + weight, 0);
  const gainsById = new Map(modes.map((mode) => [mode.id, mode.normalizedGain]));
  const normalization = Math.max(
    ...SPECTRAL_CATHEDRAL_SCORE.events.map(
      (event) =>
        event.modeIds.reduce((sum, modeId) => sum + (gainsById.get(modeId) ?? 0), 0) *
        event.baseGain *
        partialWeightSum,
    ),
  );

  if (!Number.isFinite(normalization) || normalization <= 0) {
    throw new Error("Spectral Cathedral normalization must be positive and finite");
  }
  return normalization;
}

export function createSpectralCathedralWorkletProgram(): SpectralCathedralWorkletProgram {
  const modes = createSpectralCathedralAudioModes();
  const program: SpectralCathedralWorkletProgram = {
    kind: "spectral-cathedral",
    score: SPECTRAL_CATHEDRAL_SCORE,
    modes,
    synthesis: SPECTRAL_CATHEDRAL_SYNTHESIS,
    normalization: getSpectralCathedralNormalization(modes, SPECTRAL_CATHEDRAL_SYNTHESIS),
  };

  validateSpectralCathedralWorkletProgram(program);
  return program;
}

export function createSpectralCathedralAudioProgram(): AudioEngineProgram<SpectralCathedralWorkletProgram> {
  return {
    worklet: createSpectralCathedralWorkletProgram(),
    graph: SPECTRAL_CATHEDRAL_AUDIO_GRAPH,
  };
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite`);
  }
}

function assertPositive(name: string, value: number): void {
  assertFinite(name, value);
  if (value <= 0) {
    throw new Error(`${name} must be positive`);
  }
}

export function validateSpectralCathedralWorkletProgram(
  program: SpectralCathedralWorkletProgram,
): void {
  if (program.kind !== "spectral-cathedral") {
    throw new Error("Spectral Cathedral worklet program kind is invalid");
  }
  if (program.modes.length !== 12) {
    throw new Error("Spectral Cathedral worklet program must contain 12 modes");
  }
  if (program.score.events.length !== 360) {
    throw new Error("Spectral Cathedral worklet program must contain 360 events");
  }

  const expectedModeIds = new Set(SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) => mode.id));
  const modeIds = new Set<number>();
  for (const mode of program.modes) {
    if (!Number.isInteger(mode.id) || !expectedModeIds.has(mode.id) || modeIds.has(mode.id)) {
      throw new Error(`Spectral Cathedral mode ID ${mode.id} is invalid`);
    }
    modeIds.add(mode.id);
    for (const [name, value] of [
      ["eigenvalue", mode.eigenvalue],
      ["coefficient", mode.coefficient],
      ["base frequency", mode.baseFrequencyHz],
      ["normalized gain", mode.normalizedGain],
      ["modal angular frequency", mode.modalAngularFrequency],
      ["coefficient phase offset", mode.coefficientPhaseOffset],
    ] as const) {
      assertFinite(`Spectral Cathedral ${name}`, value);
    }
    if (mode.coefficientPhaseOffset !== 0 && mode.coefficientPhaseOffset !== Math.PI) {
      throw new Error("Spectral Cathedral coefficient phase offset must be 0 or pi");
    }
  }

  assertPositive("Spectral Cathedral score cycle", program.score.cycleSeconds);
  for (const event of program.score.events) {
    if (
      !Number.isInteger(event.index) ||
      event.localTimeSeconds < 0 ||
      event.localTimeSeconds >= program.score.cycleSeconds
    ) {
      throw new Error("Spectral Cathedral event time must remain inside the score cycle");
    }
    assertFinite("Spectral Cathedral event time", event.localTimeSeconds);
    assertFinite("Spectral Cathedral event gain", event.baseGain);
    for (const [name, value] of [
      ["brightness", event.baseBrightness],
      ["wet send", event.wetSend],
      ["stereo spread", event.stereoSpread],
      ["register multiplier", event.registerMultiplier],
    ] as const) {
      assertFinite(`Spectral Cathedral event ${name}`, value);
    }
    if (event.registerMultiplier !== 1) {
      throw new Error("Spectral Cathedral piko event register multiplier must be 1");
    }
    if (!(event.gesture in program.synthesis.articulations)) {
      throw new Error("Spectral Cathedral event gesture is invalid");
    }
    for (const modeId of event.modeIds) {
      if (!modeIds.has(modeId)) {
        throw new Error(`Spectral Cathedral event mode ID ${modeId} does not exist`);
      }
    }
  }

  const preset = program.synthesis;
  if (
    !Number.isInteger(preset.maximumPartials) ||
    preset.maximumPartials <= 0 ||
    !Number.isInteger(preset.woodComponentCount) ||
    preset.woodComponentCount <= 0
  ) {
    throw new Error("Spectral Cathedral synthesis counts must be positive integers");
  }
  for (const [name, value] of [
    ["partial damping", preset.partialDamping],
    ["maximum event", preset.maximumEventSeconds],
    ["wood attack", preset.woodAttackSeconds],
    ["wood minimum frequency", preset.woodMinimumHz],
    ["wood maximum frequency", preset.woodMaximumHz],
    ["output gain", preset.outputGain],
    ["normalization", program.normalization],
  ] as const) {
    assertPositive(`Spectral Cathedral ${name}`, value);
  }
  for (const [gesture, articulation] of Object.entries(preset.articulations)) {
    for (const [name, value] of [
      ["attack", articulation.attackSeconds],
      ["decay", articulation.decaySeconds],
      ["end", articulation.endSeconds],
    ] as const) {
      assertPositive(`Spectral Cathedral ${gesture} ${name}`, value);
    }
    if (
      !Number.isFinite(articulation.fadeStartSeconds) ||
      articulation.fadeStartSeconds < 0 ||
      articulation.fadeStartSeconds >= articulation.endSeconds ||
      !Number.isFinite(articulation.woodAttackGain) ||
      articulation.woodAttackGain < 0 ||
      !Array.isArray(articulation.subgrainOffsetsSeconds) ||
      !Array.isArray(articulation.subgrainGains) ||
      articulation.subgrainOffsetsSeconds.length === 0 ||
      articulation.subgrainOffsetsSeconds.length !== articulation.subgrainGains.length ||
      articulation.subgrainOffsetsSeconds[0] !== 0 ||
      articulation.subgrainOffsetsSeconds.some(
        (offsetSeconds) =>
          !Number.isFinite(offsetSeconds) ||
          offsetSeconds < 0 ||
          offsetSeconds >= articulation.endSeconds,
      ) ||
      articulation.subgrainGains.some((gain) => !Number.isFinite(gain) || gain <= 0 || gain > 1)
    ) {
      throw new Error("Spectral Cathedral articulation range is invalid");
    }
  }
  if (
    preset.woodMinimumHz > preset.woodMaximumHz ||
    !Number.isFinite(preset.stereoDetuneRatio) ||
    preset.stereoDetuneRatio < 0 ||
    preset.stereoDetuneRatio >= 1 ||
    !Number.isFinite(preset.antiAliasRatio) ||
    preset.antiAliasRatio <= 0 ||
    preset.antiAliasRatio > 1
  ) {
    throw new Error("Spectral Cathedral synthesis range is invalid");
  }
}

const spectralRuntimeCache = new WeakMap<
  SpectralCathedralWorkletProgram,
  Map<number, SpectralCathedralRuntime>
>();

function getCachedSpectralRuntime(
  program: SpectralCathedralWorkletProgram,
  sampleRate: number,
): SpectralCathedralRuntime {
  let bySampleRate = spectralRuntimeCache.get(program);
  if (!bySampleRate) {
    bySampleRate = new Map();
    spectralRuntimeCache.set(program, bySampleRate);
  }

  let runtime = bySampleRate.get(sampleRate);
  if (!runtime) {
    runtime = createSpectralCathedralRuntime(program, sampleRate);
    bySampleRate.set(sampleRate, runtime);
  }
  return runtime;
}

function getRuntimeBellEnvelope(
  ageSeconds: number,
  event: SpectralCathedralRuntimeEvent,
  decayScale: number,
): number {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || ageSeconds >= event.endSeconds) return 0;
  const body =
    (1 - Math.exp(-ageSeconds / event.attackSeconds)) *
    Math.exp(-ageSeconds / (event.decaySeconds * decayScale));
  if (ageSeconds < event.fadeStartSeconds) return body;

  const fadeProgress =
    (ageSeconds - event.fadeStartSeconds) / (event.endSeconds - event.fadeStartSeconds);
  return body * 0.5 * (1 + Math.cos(Math.PI * fadeProgress));
}

function renderRuntimeWood(
  voice: SpectralCathedralRuntimeVoice,
  ageSeconds: number,
  woodAttackSeconds: number,
): number {
  if (ageSeconds < 0 || ageSeconds >= woodAttackSeconds || voice.woodNormalization <= 0) return 0;

  let value = 0;
  for (const component of voice.wood) {
    value +=
      component.weight *
      Math.sin(Math.PI * 2 * component.frequencyHz * ageSeconds + component.phaseRadians);
  }
  const envelope = Math.sin((Math.PI * ageSeconds) / woodAttackSeconds) ** 2;
  return (value / voice.woodNormalization) * envelope;
}

function findLatestSpectralCathedralEventIndex(
  events: readonly SpectralCathedralRuntimeEvent[],
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

interface SpectralCathedralAccumulatedSample {
  dryLeft: number;
  dryRight: number;
  wetLeft: number;
  wetRight: number;
}

function accumulateSpectralCathedralRuntimeEvent(
  runtime: SpectralCathedralRuntime,
  event: SpectralCathedralRuntimeEvent,
  absoluteEventTimeSeconds: number,
  absoluteTimeSeconds: number,
  target: SpectralCathedralAccumulatedSample,
): void {
  const baseAgeSeconds = absoluteTimeSeconds - absoluteEventTimeSeconds;
  if (baseAgeSeconds < 0 || baseAgeSeconds >= runtime.maximumEventSeconds) return;
  if (event.voices.length === 0) return;

  let expressionDisplacement = 0;
  let expressionVelocity = 0;
  for (const voice of event.voices) {
    const phase = voice.modalAngularFrequency * absoluteEventTimeSeconds;
    expressionDisplacement += Math.abs(Math.cos(phase));
    expressionVelocity += Math.abs(Math.sin(phase));
  }
  expressionDisplacement /= event.voices.length;
  expressionVelocity /= event.voices.length;

  const brightness = Math.min(1, event.baseBrightness * (0.78 + expressionVelocity * 0.38));
  const wetSend = Math.min(1, event.wetSend * (0.8 + expressionDisplacement * 0.32));
  const woodScale = 0.72 + expressionVelocity * 0.56;
  const decayScale = 0.82 + expressionDisplacement * 0.38;
  let eventLeft = 0;
  let eventRight = 0;

  for (const subgrain of event.subgrains) {
    const subgrainAgeSeconds = baseAgeSeconds - subgrain.offsetSeconds;
    const envelope = getRuntimeBellEnvelope(subgrainAgeSeconds, event, decayScale) * subgrain.gain;
    if (envelope <= 0) continue;

    for (const voice of event.voices) {
      const startPhase =
        voice.modalAngularFrequency * absoluteEventTimeSeconds + voice.coefficientPhaseOffset;
      let bellLeft = 0;
      let bellRight = 0;

      for (const partial of voice.partials) {
        const partialPosition = (partial.partial - 1) / Math.max(1, voice.partials.length - 1);
        const dampingBrightness = 1 + (brightness - 0.5) * 0.24 * partialPosition;
        const weight = partial.baseWeight * dampingBrightness;
        const partialStartPhase = partial.partial * startPhase;
        bellLeft +=
          weight *
          Math.sin(Math.PI * 2 * partial.leftFrequencyHz * absoluteTimeSeconds + partialStartPhase);
        bellRight +=
          weight *
          Math.sin(
            Math.PI * 2 * partial.rightFrequencyHz * absoluteTimeSeconds + partialStartPhase,
          );
      }

      const wood =
        event.woodAttackGain *
        woodScale *
        renderRuntimeWood(voice, subgrainAgeSeconds, runtime.woodAttackSeconds);
      eventLeft += voice.normalizedGain * voice.panLeft * (bellLeft * envelope + wood);
      eventRight += voice.normalizedGain * voice.panRight * (bellRight * envelope + wood);
    }
  }

  const scale = (runtime.outputGain * event.baseGain) / runtime.normalization;
  target.dryLeft += eventLeft * scale;
  target.dryRight += eventRight * scale;
  target.wetLeft += eventLeft * scale * wetSend;
  target.wetRight += eventRight * scale * wetSend;
}

export function renderSpectralCathedralSample(
  program: SpectralCathedralWorkletProgram,
  absoluteTimeSeconds: number,
  sampleRate: number,
): SpectralCathedralStereoSample {
  if (!Number.isFinite(absoluteTimeSeconds) || absoluteTimeSeconds < 0) {
    return { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 };
  }

  const runtime = getCachedSpectralRuntime(program, sampleRate);
  const currentCycleIndex = Math.floor(absoluteTimeSeconds / runtime.cycleSeconds);
  const currentCycleStart = currentCycleIndex * runtime.cycleSeconds;
  const localTimeSeconds = absoluteTimeSeconds - currentCycleStart;
  const target = { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 };

  const latestIndex = findLatestSpectralCathedralEventIndex(runtime.events, localTimeSeconds);
  for (let index = latestIndex; index >= 0; index -= 1) {
    const event = runtime.events[index]!;
    const absoluteEventTimeSeconds = currentCycleStart + event.localTimeSeconds;
    if (absoluteTimeSeconds - absoluteEventTimeSeconds >= runtime.maximumEventSeconds) break;
    accumulateSpectralCathedralRuntimeEvent(
      runtime,
      event,
      absoluteEventTimeSeconds,
      absoluteTimeSeconds,
      target,
    );
  }

  if (currentCycleIndex > 0 && localTimeSeconds < runtime.maximumEventSeconds) {
    const previousCycleStart = currentCycleStart - runtime.cycleSeconds;
    for (let index = runtime.events.length - 1; index >= 0; index -= 1) {
      const event = runtime.events[index]!;
      const absoluteEventTimeSeconds = previousCycleStart + event.localTimeSeconds;
      if (absoluteTimeSeconds - absoluteEventTimeSeconds >= runtime.maximumEventSeconds) break;
      accumulateSpectralCathedralRuntimeEvent(
        runtime,
        event,
        absoluteEventTimeSeconds,
        absoluteTimeSeconds,
        target,
      );
    }
  }

  return target;
}

export function renderSpectralCathedralStereo({
  program,
  startTimeSeconds,
  durationSeconds,
  sampleRate,
}: SpectralCathedralRenderOptions): {
  left: Float32Array;
  right: Float32Array;
} {
  const sampleCount = Math.floor(durationSeconds * sampleRate);
  const left = new Float32Array(sampleCount);
  const right = new Float32Array(sampleCount);

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const rendered = renderSpectralCathedralSample(
      program,
      startTimeSeconds + sampleIndex / sampleRate,
      sampleRate,
    );
    left[sampleIndex] = rendered.dryLeft;
    right[sampleIndex] = rendered.dryRight;
  }

  return { left, right };
}
