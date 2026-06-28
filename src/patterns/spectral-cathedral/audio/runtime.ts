import type { SpectralCathedralGesture, SpectralCathedralScoreEvent } from "./score";
import type {
  SpectralCathedralAudioMode,
  SpectralCathedralSynthesisPreset,
  SpectralCathedralWorkletProgram,
} from "./synthesis";

export interface SpectralCathedralRuntimeSubgrain {
  offsetSeconds: number;
  gain: number;
}

export interface SpectralCathedralRuntimePartial {
  partial: number;
  leftFrequencyHz: number;
  rightFrequencyHz: number;
  baseWeight: number;
}

export interface SpectralCathedralRuntimeWoodComponent {
  frequencyHz: number;
  phaseRadians: number;
  weight: number;
}

export interface SpectralCathedralRuntimeVoice {
  modeId: number;
  normalizedGain: number;
  modalAngularFrequency: number;
  coefficientPhaseOffset: number;
  basePan: number;
  panLeft: number;
  panRight: number;
  partials: readonly SpectralCathedralRuntimePartial[];
  wood: readonly SpectralCathedralRuntimeWoodComponent[];
  woodNormalization: number;
}

export interface SpectralCathedralRuntimeEvent {
  index: number;
  localTimeSeconds: number;
  gesture: SpectralCathedralGesture;
  baseGain: number;
  baseBrightness: number;
  wetSend: number;
  fadeStartSeconds: number;
  endSeconds: number;
  attackSeconds: number;
  decaySeconds: number;
  woodAttackGain: number;
  subgrains: readonly SpectralCathedralRuntimeSubgrain[];
  voices: readonly SpectralCathedralRuntimeVoice[];
}

export interface SpectralCathedralRuntime {
  sampleRate: number;
  cycleSeconds: number;
  maximumEventSeconds: number;
  woodAttackSeconds: number;
  outputGain: number;
  normalization: number;
  events: readonly SpectralCathedralRuntimeEvent[];
}

function getEqualPowerPanGains(pan: number): readonly [number, number] {
  const clampedPan = Math.max(-1, Math.min(1, pan));
  return [Math.sqrt((1 - clampedPan) / 2), Math.sqrt((1 + clampedPan) / 2)];
}

function hashUint32(value: number): number {
  let hash = value >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function hashUnit(eventIndex: number, modeId: number, component: number, salt: number): number {
  const seed =
    Math.imul(eventIndex + 1, 0x9e3779b1) ^
    Math.imul(modeId + 1, 0x85ebca6b) ^
    Math.imul(component + 1, 0xc2b2ae35) ^
    salt;
  return hashUint32(seed) / 0x1_0000_0000;
}

function getLowCutWeight(frequencyHz: number): number {
  const ratio = Math.max(0, frequencyHz) / 260;
  const squared = ratio * ratio;
  return squared / Math.sqrt(1 + squared * squared);
}

function createRuntimeVoice(
  event: SpectralCathedralScoreEvent,
  mode: SpectralCathedralAudioMode,
  modeIndex: number,
  sampleRate: number,
  preset: SpectralCathedralSynthesisPreset,
): SpectralCathedralRuntimeVoice {
  const centeredPan =
    event.modeIds.length === 1 ? 0 : (modeIndex / (event.modeIds.length - 1)) * 2 - 1;
  const basePan = centeredPan * event.stereoSpread;
  const [panLeft, panRight] = getEqualPowerPanGains(basePan);
  const frequencyLimitHz = sampleRate * 0.5 * preset.antiAliasRatio;
  const partials: SpectralCathedralRuntimePartial[] = [];

  for (let partial = 1; partial <= preset.maximumPartials; partial += 1) {
    const leftFrequencyHz =
      mode.baseFrequencyHz * event.registerMultiplier * partial * (1 - preset.stereoDetuneRatio);
    const rightFrequencyHz =
      mode.baseFrequencyHz * event.registerMultiplier * partial * (1 + preset.stereoDetuneRatio);
    if (Math.max(leftFrequencyHz, rightFrequencyHz) >= frequencyLimitHz) continue;
    partials.push({
      partial,
      leftFrequencyHz,
      rightFrequencyHz,
      baseWeight:
        partial ** -preset.partialDamping *
        getLowCutWeight((leftFrequencyHz + rightFrequencyHz) * 0.5),
    });
  }

  const wood: SpectralCathedralRuntimeWoodComponent[] = [];
  let woodNormalization = 0;
  for (let component = 0; component < preset.woodComponentCount; component += 1) {
    const frequencyUnit = hashUnit(event.index, mode.id, component, 0x68bc21eb);
    const phaseUnit = hashUnit(event.index, mode.id, component, 0x02e5be93);
    const frequencyHz =
      preset.woodMinimumHz + (preset.woodMaximumHz - preset.woodMinimumHz) * frequencyUnit;
    if (frequencyHz >= frequencyLimitHz) continue;
    const weight = 1 / Math.sqrt(component + 1);
    wood.push({
      frequencyHz,
      phaseRadians: Math.PI * 2 * phaseUnit,
      weight,
    });
    woodNormalization += weight;
  }

  return {
    modeId: mode.id,
    normalizedGain: mode.normalizedGain,
    modalAngularFrequency: mode.modalAngularFrequency,
    coefficientPhaseOffset: mode.coefficientPhaseOffset,
    basePan,
    panLeft,
    panRight,
    partials,
    wood,
    woodNormalization,
  };
}

export function createSpectralCathedralRuntime(
  program: SpectralCathedralWorkletProgram,
  sampleRate: number,
): SpectralCathedralRuntime {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error("Spectral Cathedral runtime sample rate must be positive and finite");
  }

  const modesById = new Map(program.modes.map((mode) => [mode.id, mode]));
  return {
    sampleRate,
    cycleSeconds: program.score.cycleSeconds,
    maximumEventSeconds: program.synthesis.maximumEventSeconds,
    woodAttackSeconds: program.synthesis.woodAttackSeconds,
    outputGain: program.synthesis.outputGain,
    normalization: program.normalization,
    events: program.score.events.map((event) => {
      const articulation = program.synthesis.articulations[event.gesture];
      return {
        index: event.index,
        localTimeSeconds: event.localTimeSeconds,
        gesture: event.gesture,
        baseGain: event.baseGain,
        baseBrightness: event.baseBrightness,
        wetSend: event.wetSend,
        fadeStartSeconds: articulation.fadeStartSeconds,
        endSeconds: articulation.endSeconds,
        attackSeconds: articulation.attackSeconds,
        decaySeconds: articulation.decaySeconds,
        woodAttackGain: articulation.woodAttackGain,
        subgrains: articulation.subgrainOffsetsSeconds.map((offsetSeconds, index) => ({
          offsetSeconds,
          gain: articulation.subgrainGains[index]!,
        })),
        voices: event.modeIds.map((modeId, modeIndex) => {
          const mode = modesById.get(modeId);
          if (!mode) throw new Error(`Missing Spectral Cathedral audio mode ${modeId}`);
          return createRuntimeVoice(event, mode, modeIndex, sampleRate, program.synthesis);
        }),
      };
    }),
  };
}
