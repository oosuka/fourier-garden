import {
  evaluateScoreEvent,
  getResidueBloomContact,
  getResidueBloomNoteEnvelope,
  getResidueBloomNoteShape,
  type ResidueBloomNoteShape,
} from "./score";
import type { ResidueBloomWorkletProgram } from "./synthesis";

interface RuntimePartial {
  leftFrequency: number;
  rightFrequency: number;
  leftGain: number;
  rightGain: number;
  leftPhase: number;
  rightPhase: number;
  contact: boolean;
}

interface RuntimeVoice {
  ordinal: number;
  startSeconds: number;
  shape: ResidueBloomNoteShape | null;
  partialCount: number;
  partials: RuntimePartial[];
  normalization: number;
  wetScale: number;
}

export interface ResidueBloomRuntime {
  program: ResidueBloomWorkletProgram;
  sampleRate: number;
  stereo: boolean;
  weights: Float64Array;
  panBases: Float64Array;
  voices: RuntimeVoice[];
  sample: { dryLeft: number; dryRight: number; wetLeft: number; wetRight: number };
}

export function createResidueBloomRuntime(
  program: ResidueBloomWorkletProgram,
  sampleRate: number,
  stereo = true,
): ResidueBloomRuntime {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0)
    throw new RangeError("Invalid Residue sample rate");
  const partialCount = program.partials.length;
  return {
    program,
    sampleRate,
    stereo,
    weights: Float64Array.from(
      program.partials,
      (partial, index) =>
        partial.sourceAmplitude / (index + 1) ** program.score.definition.timbreDamping,
    ),
    panBases: Float64Array.from(
      program.partials,
      (_, index) => Math.sin(index * 2.399963229728653) * 0.24,
    ),
    voices: Array.from(
      {
        length: Math.ceil(program.score.definition.maximumNoteSeconds / program.score.stepSeconds),
      },
      () => ({
        ordinal: -1,
        startSeconds: 0,
        shape: null,
        partialCount: 0,
        normalization: 0,
        wetScale: 0,
        partials: Array.from({ length: partialCount }, () => ({
          leftFrequency: 0,
          rightFrequency: 0,
          leftGain: 0,
          rightGain: 0,
          leftPhase: 0,
          rightPhase: 0,
          contact: false,
        })),
      }),
    ),
    sample: { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 },
  };
}

// The pole colors each carrier before the finite envelope. Its analytic response
// has no filter history, so a seek reconstructs the same waveform as continuous play.
function prepareVoice(runtime: ResidueBloomRuntime, voice: RuntimeVoice, ordinal: number): void {
  const { program, sampleRate } = runtime;
  const { score } = program;
  const event = evaluateScoreEvent(
    score,
    score.events[ordinal % score.totalSteps]!,
    Math.floor(ordinal / score.totalSteps),
  );
  voice.ordinal = ordinal;
  voice.startSeconds = event.absoluteTimeSeconds;
  voice.shape = getResidueBloomNoteShape(score.definition, event);
  voice.partialCount = 0;
  voice.normalization = 0;
  voice.wetScale = event.wetSend * 0.5;
  if (!event.active) return;

  const limit = sampleRate * 0.5 * score.definition.antiAliasRatio;
  const detune = runtime.stereo ? score.definition.stereoDetuneRatio : 0;
  const cutoff = 520 + (Math.min(2_050, sampleRate * 0.2) - 520) * event.brightness;
  const pole = Math.exp((-2 * Math.PI * cutoff) / sampleRate);
  const numerator = 1 - pole;
  for (let index = 0; index < program.partials.length; index++) {
    const partial = program.partials[index]!;
    const nominal = event.carrierHz * partial.harmonic;
    // Use the real stereo guard even when making the mono diagnostic render.
    if (nominal * (1 + score.definition.stereoDetuneRatio) >= limit) continue;
    const output = voice.partials[voice.partialCount]!;
    const weight = runtime.weights[index]!;
    const pan = Math.max(
      -0.92,
      Math.min(
        0.92,
        event.normalizedPhasorX * 0.28 + runtime.panBases[index]! * event.stereoSpread,
      ),
    );
    output.leftFrequency = nominal * (1 - detune);
    output.rightFrequency = nominal * (1 + detune);
    const leftAngle = (2 * Math.PI * output.leftFrequency) / sampleRate;
    const rightAngle = (2 * Math.PI * output.rightFrequency) / sampleRate;
    const leftReal = 1 - pole * Math.cos(leftAngle);
    const leftImaginary = pole * Math.sin(leftAngle);
    const rightReal = 1 - pole * Math.cos(rightAngle);
    const rightImaginary = pole * Math.sin(rightAngle);
    output.leftGain =
      (weight * (runtime.stereo ? Math.sqrt((1 - pan) / 2) : 1) * numerator) /
      Math.hypot(leftReal, leftImaginary);
    output.rightGain =
      (weight * (runtime.stereo ? Math.sqrt((1 + pan) / 2) : 1) * numerator) /
      Math.hypot(rightReal, rightImaginary);
    output.leftPhase = partial.sinePhase - Math.atan2(leftImaginary, leftReal);
    output.rightPhase = partial.sinePhase - Math.atan2(rightImaginary, rightReal);
    output.contact = partial.harmonic !== 1;
    voice.normalization += weight;
    voice.partialCount++;
  }
}

export function renderResidueBloomSample(
  runtime: ResidueBloomRuntime,
  timeSeconds: number,
): ResidueBloomRuntime["sample"] {
  const time = Math.max(0, timeSeconds);
  const ordinal = Math.floor(time / runtime.program.score.stepSeconds);
  const sample = runtime.sample;
  sample.dryLeft = 0;
  sample.dryRight = 0;
  sample.wetLeft = 0;
  sample.wetRight = 0;
  // Only the fixed, bounded overlap is considered, never the whole score table.
  for (let offset = 0; offset < runtime.voices.length && offset <= ordinal; offset++) {
    const eventOrdinal = ordinal - offset;
    const voice = runtime.voices[eventOrdinal % runtime.voices.length]!;
    if (voice.ordinal !== eventOrdinal) prepareVoice(runtime, voice, eventOrdinal);
    if (!voice.shape || voice.normalization <= 0) continue;
    const age = time - voice.startSeconds;
    const envelope = getResidueBloomNoteEnvelope(voice.shape, age);
    if (envelope <= 0) continue;
    const contact = getResidueBloomContact(voice.shape, age);
    let left = 0;
    let right = 0;
    for (let index = 0; index < voice.partialCount; index++) {
      const partial = voice.partials[index]!;
      const color = partial.contact ? contact : 1;
      left +=
        Math.sin(2 * Math.PI * partial.leftFrequency * age + partial.leftPhase) *
        partial.leftGain *
        color;
      right +=
        Math.sin(2 * Math.PI * partial.rightFrequency * age + partial.rightPhase) *
        partial.rightGain *
        color;
    }
    const scale =
      (envelope * voice.shape.gain * runtime.program.score.definition.outputGain) /
      voice.normalization;
    sample.dryLeft += left * scale;
    sample.dryRight += right * scale;
    sample.wetLeft += left * scale * voice.wetScale;
    sample.wetRight += right * scale * voice.wetScale;
  }
  return sample;
}
