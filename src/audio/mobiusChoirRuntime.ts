import type {
  MobiusChoirAudioMode,
  MobiusChoirFormantBand,
  MobiusChoirWorkletProgram,
} from "./audioProgram";
import type { MobiusChoirGesture, MobiusChoirScoreEvent } from "./mobiusChoirScore";

export interface MobiusChoirRuntimePartial {
  partial: number;
  leftFrequencyHz: number;
  rightFrequencyHz: number;
  baseWeight: number;
  startWeight: number;
  endWeight: number;
}

export interface MobiusChoirRuntimeBreathComponent {
  frequencyHz: number;
  phase: number;
  weight: number;
}

export interface MobiusChoirRuntimeVoice {
  modeId: number;
  modalAngularFrequency: number;
  normalizedGain: number;
  phaseOffset: number;
  basePan: number;
  controlPhaseOffset: number;
  panLeft: number;
  panRight: number;
  partials: readonly MobiusChoirRuntimePartial[];
  breath: readonly MobiusChoirRuntimeBreathComponent[];
  breathNormalization: number;
}

export interface MobiusChoirRuntimeEvent {
  index: number;
  localTimeSeconds: number;
  gesture: MobiusChoirGesture;
  baseGain: number;
  wetSend: number;
  fadeStartSeconds: number;
  endSeconds: number;
  breathGain: number;
  partialCount: number;
  amplitudeMotionDepth: number;
  brightnessMotionDepth: number;
  panMotion: number;
  voices: readonly MobiusChoirRuntimeVoice[];
}

export interface MobiusChoirRuntime {
  sampleRate: number;
  cycleSeconds: number;
  maximumEventSeconds: number;
  breathSeconds: number;
  outputGain: number;
  normalization: number;
  events: readonly MobiusChoirRuntimeEvent[];
}

function getFormantWeight(
  bands: readonly MobiusChoirFormantBand[],
  floor: number,
  frequencyHz: number,
): number {
  let sum = floor;
  for (const band of bands) {
    const normalized = (frequencyHz - band.frequencyHz) / band.bandwidthHz;
    sum += band.amplitude * Math.exp(-0.5 * normalized * normalized);
  }
  return sum;
}

function getEqualPowerPanGains(pan: number): readonly [number, number] {
  const clamped = Math.min(1, Math.max(-1, pan));
  return [Math.sqrt((1 - clamped) / 2), Math.sqrt((1 + clamped) / 2)];
}

function getVoicePan(
  event: MobiusChoirScoreEvent,
  modeIndex: number,
  voiceIndex: number,
  voiceCount: number,
): number {
  const modeCount = event.modeIds.length;
  const center =
    modeCount === 1
      ? 0
      : -0.45 * event.stereoSpread +
        (modeIndex / Math.max(1, modeCount - 1)) * 0.9 * event.stereoSpread;
  return voiceCount === 1 ? center : center + (voiceIndex === 0 ? -0.3 : 0.3) * event.stereoSpread;
}

function hashUint32(value: number): number {
  let hash = value >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function hashUnit(eventIndex: number, modeId: number, voiceIndex: number, component: number) {
  const seed =
    Math.imul(eventIndex + 1, 0x9e3779b1) ^
    Math.imul(modeId + 1, 0x85ebca6b) ^
    Math.imul(voiceIndex + 1, 0xc2b2ae35) ^
    Math.imul(component + 1, 0x27d4eb2f);
  return hashUint32(seed) / 0x1_0000_0000;
}

function createRuntimeVoice(
  program: MobiusChoirWorkletProgram,
  sampleRate: number,
  event: MobiusChoirScoreEvent,
  mode: MobiusChoirAudioMode,
  modeIndex: number,
  voiceIndex: number,
  voiceCount: number,
): MobiusChoirRuntimeVoice {
  const synthesis = program.synthesis;
  const frequencyLimit = sampleRate * 0.5 * synthesis.antiAliasRatio;
  const partials: MobiusChoirRuntimePartial[] = [];
  for (
    let partial = 1;
    partial <= Math.min(synthesis.maximumPartials, event.partialCount);
    partial += 1
  ) {
    const leftFrequencyHz =
      mode.baseFrequencyHz * event.registerMultiplier * partial * (1 - synthesis.stereoDetuneRatio);
    const rightFrequencyHz =
      mode.baseFrequencyHz * event.registerMultiplier * partial * (1 + synthesis.stereoDetuneRatio);
    if (Math.max(leftFrequencyHz, rightFrequencyHz) >= frequencyLimit) continue;
    const averageFrequencyHz = (leftFrequencyHz + rightFrequencyHz) * 0.5;
    partials.push({
      partial,
      leftFrequencyHz,
      rightFrequencyHz,
      baseWeight: partial ** -synthesis.partialDamping,
      startWeight: getFormantWeight(
        synthesis.formants[event.vowelStart],
        synthesis.formantFloor,
        averageFrequencyHz,
      ),
      endWeight: getFormantWeight(
        synthesis.formants[event.vowelEnd],
        synthesis.formantFloor,
        averageFrequencyHz,
      ),
    });
  }

  const breath: MobiusChoirRuntimeBreathComponent[] = [];
  let breathNormalization = 0;
  for (let component = 0; component < synthesis.breathComponentCount; component += 1) {
    const frequencyHz =
      synthesis.breathMinimumHz +
      (synthesis.breathMaximumHz - synthesis.breathMinimumHz) *
        hashUnit(event.index, mode.id, voiceIndex, component);
    if (frequencyHz >= frequencyLimit) continue;
    const weight = 1 / Math.sqrt(component + 1);
    breath.push({
      frequencyHz,
      phase: Math.PI * 2 * hashUnit(event.index, mode.id, voiceIndex + 7, component),
      weight,
    });
    breathNormalization += weight;
  }
  const basePan = getVoicePan(event, modeIndex, voiceIndex, voiceCount);
  const [panLeft, panRight] = getEqualPowerPanGains(basePan);
  return {
    modeId: mode.id,
    modalAngularFrequency: mode.modalAngularFrequency,
    normalizedGain: mode.normalizedGain,
    phaseOffset: voiceIndex === 0 ? 0 : -Math.PI / 2,
    basePan,
    controlPhaseOffset: mode.n * (((mode.id - 1) * Math.PI) / program.modes.length),
    panLeft,
    panRight,
    partials,
    breath,
    breathNormalization,
  };
}

export function createMobiusChoirRuntime(
  program: MobiusChoirWorkletProgram,
  sampleRate: number,
): MobiusChoirRuntime {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error("Möbius Choir runtime sample rate must be positive and finite");
  }
  const modesById = new Map(program.modes.map((mode) => [mode.id, mode]));
  const events = program.score.events.map((event) => {
    const voices: MobiusChoirRuntimeVoice[] = [];
    for (const [modeIndex, modeId] of event.modeIds.entries()) {
      const mode = modesById.get(modeId);
      if (!mode) throw new Error(`Missing Möbius Choir audio mode ${modeId}`);
      const voiceCount = mode.voiceKind === "single" ? 1 : 2;
      for (let voiceIndex = 0; voiceIndex < voiceCount; voiceIndex += 1) {
        voices.push(
          createRuntimeVoice(program, sampleRate, event, mode, modeIndex, voiceIndex, voiceCount),
        );
      }
    }
    const articulation = program.synthesis.articulations[event.gesture];
    return {
      index: event.index,
      localTimeSeconds: event.localTimeSeconds,
      gesture: event.gesture,
      baseGain: event.baseGain,
      wetSend: event.wetSend,
      fadeStartSeconds: articulation.fadeStartSeconds,
      endSeconds: articulation.endSeconds,
      breathGain: articulation.breathGain,
      partialCount: event.partialCount,
      amplitudeMotionDepth: event.amplitudeMotionDepth,
      brightnessMotionDepth: event.brightnessMotionDepth,
      panMotion: event.panMotion,
      voices,
    };
  });
  return {
    sampleRate,
    cycleSeconds: program.score.cycleSeconds,
    maximumEventSeconds: program.synthesis.maximumEventSeconds,
    breathSeconds: program.synthesis.breathSeconds,
    outputGain: program.synthesis.outputGain,
    normalization: program.normalization,
    events,
  };
}

function countOscillatorsAtTime(runtime: MobiusChoirRuntime, absoluteTimeSeconds: number): number {
  const currentCycle = Math.floor(absoluteTimeSeconds / runtime.cycleSeconds);
  let count = 0;
  for (
    let cycleIndex = Math.max(0, currentCycle - 1);
    cycleIndex <= currentCycle;
    cycleIndex += 1
  ) {
    const cycleStart = cycleIndex * runtime.cycleSeconds;
    for (const event of runtime.events) {
      const ageSeconds = absoluteTimeSeconds - (cycleStart + event.localTimeSeconds);
      if (ageSeconds <= 0 || ageSeconds >= event.endSeconds) continue;
      for (const voice of event.voices) {
        count += voice.partials.length;
        if (ageSeconds < runtime.breathSeconds) count += voice.breath.length;
      }
    }
  }
  return count;
}

export function getMobiusChoirMaximumOscillatorCount(runtime: MobiusChoirRuntime): number {
  const epsilon = 1 / runtime.sampleRate;
  let maximum = 0;
  for (let cycleIndex = 0; cycleIndex <= 1; cycleIndex += 1) {
    const cycleStart = cycleIndex * runtime.cycleSeconds;
    for (const event of runtime.events) {
      for (const offset of [0, runtime.breathSeconds, event.endSeconds]) {
        maximum = Math.max(
          maximum,
          countOscillatorsAtTime(runtime, cycleStart + event.localTimeSeconds + offset + epsilon),
        );
      }
    }
  }
  return maximum;
}
