import { SPECTRAL_CATHEDRAL_DEFINITION } from "../math/model";
import type { AudioEngineProgram, AudioGraphPreset } from "../../../audio/audioProgram";
import {
  SPECTRAL_CATHEDRAL_SCORE,
  evaluateSpectralCathedralEvents,
  type EvaluatedSpectralCathedralEvent,
  type SpectralCathedralGesture,
  type SpectralCathedralScoreProgram,
} from "./score";

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
  maximumPartials: 8,
  partialDamping: 1.65,
  articulations: {
    toll: {
      attackSeconds: 0.003,
      decaySeconds: 0.42,
      fadeStartSeconds: 2.17,
      endSeconds: 2.2,
      woodAttackGain: 0.07,
    },
    answer: {
      attackSeconds: 0.0025,
      decaySeconds: 0.24,
      fadeStartSeconds: 1.07,
      endSeconds: 1.1,
      woodAttackGain: 0.09,
    },
    cascade: {
      attackSeconds: 0.002,
      decaySeconds: 0.125,
      fadeStartSeconds: 0.59,
      endSeconds: 0.62,
      woodAttackGain: 0.1,
    },
    pulse: {
      attackSeconds: 0.0015,
      decaySeconds: 0.085,
      fadeStartSeconds: 0.39,
      endSeconds: 0.42,
      woodAttackGain: 0.14,
    },
    choir: {
      attackSeconds: 0.005,
      decaySeconds: 0.52,
      fadeStartSeconds: 2.57,
      endSeconds: 2.6,
      woodAttackGain: 0.055,
    },
  },
  maximumEventSeconds: 2.6,
  woodAttackSeconds: 0.02,
  woodMinimumHz: 700,
  woodMaximumHz: 2_800,
  woodComponentCount: 8,
  stereoDetuneRatio: 0.00125,
  antiAliasRatio: 0.9,
  outputGain: 1.065,
} as const satisfies SpectralCathedralSynthesisPreset;

export const SPECTRAL_CATHEDRAL_AUDIO_GRAPH: AudioGraphPreset = {
  dryHighPassHz: 90,
  dryHighPassQ: 0.45,
  dryHighShelfHz: 4_200,
  dryHighShelfGainDb: -1,
  dryLowPassHz: 8_500,
  dryLowPassQ: 0.3,
  dryGain: 0.86,
  wetHighPassHz: 160,
  wetHighPassQ: 0.45,
  wetGain: 0.12,
  roomSeconds: 1.6,
  roomDecay: 3.2,
  compressor: {
    thresholdDb: -14,
    kneeDb: 12,
    ratio: 3,
    attackSeconds: 0.006,
    releaseSeconds: 0.24,
  },
  limiterCeilingDbfs: -1,
};

export function createSpectralCathedralAudioModes(): SpectralCathedralAudioMode[] {
  const maximumCoefficient = Math.max(
    ...SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) => Math.abs(mode.coefficient)),
  );

  return SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) => ({
    id: mode.id,
    eigenvalue: mode.eigenvalue,
    coefficient: mode.coefficient,
    baseFrequencyHz: 176 * Math.sqrt(mode.eigenvalue / 3),
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
  if (program.score.events.length !== 95) {
    throw new Error("Spectral Cathedral worklet program must contain 95 events");
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
    if (![1, 1.5, 2].includes(event.registerMultiplier)) {
      throw new Error("Spectral Cathedral event register multiplier is invalid");
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
      articulation.woodAttackGain < 0
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

interface SpectralCathedralEventExpression {
  brightness: number;
  wetSend: number;
  woodScale: number;
  decayScale: number;
}

function evaluateEventExpression(
  event: EvaluatedSpectralCathedralEvent,
  modes: readonly SpectralCathedralAudioMode[],
): SpectralCathedralEventExpression {
  const selected = modes.filter((mode) => event.modeIds.includes(mode.id));
  if (selected.length === 0) {
    throw new Error("Spectral Cathedral event has no valid modes");
  }
  const displacement =
    selected.reduce(
      (sum, mode) =>
        sum + evaluateSpectralCathedralModeExpression(mode, event.absoluteTimeSeconds).displacement,
      0,
    ) / selected.length;
  const velocity =
    selected.reduce(
      (sum, mode) =>
        sum + evaluateSpectralCathedralModeExpression(mode, event.absoluteTimeSeconds).velocity,
      0,
    ) / selected.length;

  return {
    brightness: Math.min(1, event.baseBrightness * (0.78 + velocity * 0.38)),
    wetSend: Math.min(1, event.wetSend * (0.8 + displacement * 0.32)),
    woodScale: 0.72 + velocity * 0.56,
    decayScale: 0.82 + displacement * 0.38,
  };
}

function renderModeVoice(
  mode: SpectralCathedralAudioMode,
  pan: number,
  event: EvaluatedSpectralCathedralEvent,
  expression: SpectralCathedralEventExpression,
  sampleRate: number,
  preset: SpectralCathedralSynthesisPreset,
): readonly [number, number] {
  const [panLeft, panRight] = getEqualPowerPanGains(pan);
  const maximumFrequencyHz = sampleRate * 0.5 * preset.antiAliasRatio;
  const startPhase =
    mode.modalAngularFrequency * event.absoluteTimeSeconds + mode.coefficientPhaseOffset;
  let bellLeft = 0;
  let bellRight = 0;

  for (let partial = 1; partial <= preset.maximumPartials; partial += 1) {
    const leftFrequencyHz =
      mode.baseFrequencyHz * event.registerMultiplier * partial * (1 - preset.stereoDetuneRatio);
    const rightFrequencyHz =
      mode.baseFrequencyHz * event.registerMultiplier * partial * (1 + preset.stereoDetuneRatio);
    if (Math.max(leftFrequencyHz, rightFrequencyHz) >= maximumFrequencyHz) continue;

    const damping = preset.partialDamping + (1 - expression.brightness) * 0.45;
    const weight = partial ** -damping;
    const partialStartPhase = partial * startPhase;
    bellLeft +=
      weight * Math.sin(Math.PI * 2 * leftFrequencyHz * event.ageSeconds + partialStartPhase);
    bellRight +=
      weight * Math.sin(Math.PI * 2 * rightFrequencyHz * event.ageSeconds + partialStartPhase);
  }

  const bellEnvelope = getSpectralCathedralBellEnvelope(
    event.ageSeconds,
    event.gesture,
    preset,
    expression.decayScale,
  );
  const articulation = preset.articulations[event.gesture];
  const wood =
    articulation.woodAttackGain *
    expression.woodScale *
    getSpectralCathedralWoodAttack(event.absoluteEventIndex, mode.id, event.ageSeconds, preset);
  const voiceLeft = mode.normalizedGain * panLeft * (bellLeft * bellEnvelope + wood);
  const voiceRight = mode.normalizedGain * panRight * (bellRight * bellEnvelope + wood);
  return [voiceLeft, voiceRight];
}

export function renderSpectralCathedralSample(
  program: SpectralCathedralWorkletProgram,
  absoluteTimeSeconds: number,
  sampleRate: number,
): SpectralCathedralStereoSample {
  const events = evaluateSpectralCathedralEvents(
    program.score,
    absoluteTimeSeconds,
    program.synthesis.maximumEventSeconds,
  );
  if (events.length === 0) {
    return { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 };
  }

  let left = 0;
  let right = 0;
  let wetLeft = 0;
  let wetRight = 0;
  const modesById = new Map(program.modes.map((mode) => [mode.id, mode]));

  for (const event of events) {
    let eventLeft = 0;
    let eventRight = 0;
    const expression = evaluateEventExpression(event, program.modes);
    for (const [voiceIndex, modeId] of event.modeIds.entries()) {
      const mode = modesById.get(modeId);
      if (!mode) {
        throw new Error(`Missing Spectral Cathedral audio mode ${modeId}`);
      }
      const centeredPan =
        event.modeIds.length === 1 ? 0 : (voiceIndex / (event.modeIds.length - 1)) * 2 - 1;
      const pan = centeredPan * event.stereoSpread;
      const [voiceLeft, voiceRight] = renderModeVoice(
        mode,
        pan,
        event,
        expression,
        sampleRate,
        program.synthesis,
      );
      eventLeft += voiceLeft;
      eventRight += voiceRight;
    }

    const scale = (program.synthesis.outputGain * event.baseGain) / program.normalization;
    left += eventLeft * scale;
    right += eventRight * scale;
    wetLeft += eventLeft * scale * expression.wetSend;
    wetRight += eventRight * scale * expression.wetSend;
  }

  return {
    dryLeft: left,
    dryRight: right,
    wetLeft,
    wetRight,
  };
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
