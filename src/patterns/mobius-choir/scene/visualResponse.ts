import { MOBIUS_CHOIR_SCORE, evaluateMobiusChoirEvents } from "../audio/score";
import {
  MOBIUS_CHOIR_SYNTHESIS,
  createMobiusChoirWorkletProgram,
  getMobiusChoirContinuousAmplitude,
  getMobiusChoirContinuousBrightness,
  getMobiusChoirEnvelope,
  getMobiusChoirVowelProgress,
} from "../audio/synthesis";
import { createMobiusChoirRuntime } from "../audio/runtime";
import {
  MOBIUS_CHOIR_DEFINITION,
  evaluateMobiusChoirModeKinematics,
  getMobiusChoirTravelSpeed,
} from "../math/model";
import { evaluateMobiusChoirDramaturgy } from "./dramaturgy";

export interface MobiusChoirModeVisualResponse {
  acousticEnergy: number;
  overtoneRatio: number;
  energy: number;
  mathematicalDisplacement: number;
  mathematicalVelocity: number;
  displacement: number;
  velocity: number;
  ribbonWidth: number;
  opacity: number;
  warmth: number;
  seamAfterglow: number;
  pulseEnergy: number;
  pulseTravel: number;
}

const AUDIO_RUNTIME = createMobiusChoirRuntime(createMobiusChoirWorkletProgram(), 48_000);

export interface MobiusChoirVisualFrame {
  dramaturgy: ReturnType<typeof evaluateMobiusChoirDramaturgy>;
  collectiveEnergy: number;
  onsetEnergy: number;
  seamEnergy: number;
  modes: readonly MobiusChoirModeVisualResponse[];
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function wrap01(value: number): number {
  return ((value % 1) + 1) % 1;
}

export function evaluateMobiusChoirVisualFrame(
  absoluteTimeSeconds: number,
): MobiusChoirVisualFrame {
  if (!Number.isFinite(absoluteTimeSeconds) || absoluteTimeSeconds < 0) {
    throw new Error("Möbius Choir visual response time must be finite and nonnegative");
  }
  const dramaturgy = evaluateMobiusChoirDramaturgy(absoluteTimeSeconds);
  const events = evaluateMobiusChoirEvents(
    MOBIUS_CHOIR_SCORE,
    absoluteTimeSeconds,
    MOBIUS_CHOIR_SYNTHESIS.maximumEventSeconds,
  );
  const energy = new Float64Array(MOBIUS_CHOIR_DEFINITION.modes.length);
  const displacement = new Float64Array(energy.length);
  const velocity = new Float64Array(energy.length);
  const seam = new Float64Array(energy.length);
  const pulseEnergy = new Float64Array(energy.length);
  const pulseTravel = new Float64Array(energy.length);
  const spectralWeight = new Float64Array(energy.length);
  const overtoneWeight = new Float64Array(energy.length);
  let collectiveEnergy = 0;
  let onsetEnergy = 0;

  for (const event of events) {
    const audioEvent = AUDIO_RUNTIME.events[event.index]!;
    for (const modeId of event.modeIds) {
      const mode = MOBIUS_CHOIR_DEFINITION.modes[modeId - 1];
      if (!mode) continue;
      const laneY = ((mode.id - 1) * Math.PI) / MOBIUS_CHOIR_DEFINITION.modes.length;
      const kinematics = evaluateMobiusChoirModeKinematics(mode, laneY, absoluteTimeSeconds);
      const index = modeId - 1;
      const voice = audioEvent.voices.find((candidate) => candidate.modeId === modeId)!;
      const amplitude = getMobiusChoirContinuousAmplitude(
        kinematics.phase,
        event.amplitudeMotionDepth,
      );
      let eventEnvelope = 0;
      for (const mora of audioEvent.mora) {
        const age = event.ageSeconds - mora.offsetSeconds;
        const envelope =
          getMobiusChoirEnvelope(age, event.gesture) *
          mora.gain *
          event.baseGain *
          voice.normalizedGain *
          amplitude;
        eventEnvelope += envelope;
        const vowelProgress = getMobiusChoirVowelProgress(age, audioEvent.fadeStartSeconds);
        for (const partial of voice.partials) {
          const brightness = getMobiusChoirContinuousBrightness(
            kinematics.phase,
            event.brightnessMotionDepth,
            (partial.partial - 1) / Math.max(1, event.partialCount - 1),
          );
          const weight =
            envelope *
            partial.baseWeight *
            brightness *
            (partial.startWeight + (partial.endWeight - partial.startWeight) * vowelProgress);
          spectralWeight[index] = spectralWeight[index]! + weight;
          if (partial.partial > 1) overtoneWeight[index] = overtoneWeight[index]! + weight;
        }
      }
      collectiveEnergy += eventEnvelope;
      onsetEnergy = Math.max(onsetEnergy, eventEnvelope * Math.exp(-event.ageSeconds / 0.18) * 2.2);
      energy[index] = energy[index]! + eventEnvelope;
      displacement[index] = Math.max(displacement[index]!, eventEnvelope * kinematics.displacement);
      velocity[index] = Math.max(velocity[index]!, eventEnvelope * kinematics.velocity);
      seam[index] = Math.max(
        seam[index]!,
        eventEnvelope * (0.25 + 0.75 * Math.abs(Math.cos(kinematics.phase + mode.n * Math.PI))),
      );
      const pulseCandidate = clamp01(Math.sqrt(eventEnvelope) * 1.4);
      if (pulseCandidate > pulseEnergy[index]!) {
        pulseEnergy[index] = pulseCandidate;
      }
    }
  }

  const modes = MOBIUS_CHOIR_DEFINITION.modes.map((mode, index) => {
    const laneY = (index * Math.PI) / MOBIUS_CHOIR_DEFINITION.modes.length;
    const kinematics = evaluateMobiusChoirModeKinematics(mode, laneY, absoluteTimeSeconds);
    const modeSpeed = mode.n > 0 ? getMobiusChoirTravelSpeed(mode) : 0;
    pulseTravel[index] = wrap01((laneY + modeSpeed * absoluteTimeSeconds) / (2 * Math.PI));
    const ambientDisplacement = kinematics.displacement;
    const ambientVelocity = kinematics.velocity;
    const normalizedEnergy = clamp01(
      Math.max(
        Math.sqrt(energy[index]!) * 1.5,
        0.07 + ambientVelocity * 0.09 + dramaturgy.motionEnergy * 0.04,
      ),
    );
    const normalizedDisplacement = clamp01(
      Math.max(displacement[index]! * 2.5, 0.035 + ambientDisplacement * 0.16),
    );
    const normalizedVelocity = clamp01(
      Math.max(velocity[index]! * 2.5, 0.035 + ambientVelocity * 0.2),
    );
    const seamAfterglow = clamp01(seam[index]! * 2.1);
    const overtoneRatio =
      spectralWeight[index]! > 0 ? overtoneWeight[index]! / spectralWeight[index]! : 0;
    return {
      acousticEnergy: clamp01(energy[index]!),
      overtoneRatio,
      energy: normalizedEnergy,
      mathematicalDisplacement: ambientDisplacement,
      mathematicalVelocity: ambientVelocity,
      displacement: normalizedDisplacement,
      velocity: normalizedVelocity,
      ribbonWidth: clamp01(0.12 + normalizedEnergy * 0.52 + normalizedVelocity * 0.36),
      opacity: clamp01(0.08 + normalizedEnergy * 0.72 + normalizedDisplacement * 0.2),
      warmth: clamp01(overtoneRatio * 4 + normalizedVelocity * 0.12),
      seamAfterglow,
      pulseEnergy: pulseEnergy[index]!,
      pulseTravel: pulseTravel[index]!,
    } satisfies MobiusChoirModeVisualResponse;
  });

  return {
    dramaturgy,
    collectiveEnergy: clamp01(collectiveEnergy * 1.55 + dramaturgy.audioEnergy * 0.45),
    onsetEnergy: clamp01(onsetEnergy + dramaturgy.motionEnergy * 0.35),
    seamEnergy: clamp01(Math.max(...seam) * 1.9 + dramaturgy.visualEnergy * 0.35),
    modes,
  };
}
