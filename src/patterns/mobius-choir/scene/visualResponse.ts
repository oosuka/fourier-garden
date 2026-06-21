import { MOBIUS_CHOIR_SCORE, evaluateMobiusChoirEvents } from "../audio/score";
import { MOBIUS_CHOIR_SYNTHESIS, getMobiusChoirEnvelope } from "../audio/synthesis";
import { MOBIUS_CHOIR_DEFINITION, evaluateMobiusChoirModeKinematics } from "../math/model";
import { evaluateMobiusChoirDramaturgy } from "./dramaturgy";

export interface MobiusChoirModeVisualResponse {
  acousticEnergy: number;
  energy: number;
  mathematicalDisplacement: number;
  mathematicalVelocity: number;
  displacement: number;
  velocity: number;
  ribbonWidth: number;
  opacity: number;
  cyanRatio: number;
  seamAfterglow: number;
}

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
  let collectiveEnergy = 0;
  let onsetEnergy = 0;

  for (const event of events) {
    const eventEnvelope =
      getMobiusChoirEnvelope(event.ageSeconds, event.gesture, MOBIUS_CHOIR_SYNTHESIS) *
      event.baseGain;
    collectiveEnergy = Math.max(collectiveEnergy, eventEnvelope);
    onsetEnergy = Math.max(onsetEnergy, eventEnvelope * Math.exp(-event.ageSeconds / 0.18) * 2.2);
    for (const modeId of event.modeIds) {
      const mode = MOBIUS_CHOIR_DEFINITION.modes[modeId - 1];
      if (!mode) continue;
      const laneY = ((mode.id - 1) * Math.PI) / MOBIUS_CHOIR_DEFINITION.modes.length;
      const kinematics = evaluateMobiusChoirModeKinematics(mode, laneY, event.absoluteTimeSeconds);
      const index = modeId - 1;
      energy[index] = Math.max(energy[index]!, eventEnvelope);
      displacement[index] = Math.max(displacement[index]!, eventEnvelope * kinematics.displacement);
      velocity[index] = Math.max(velocity[index]!, eventEnvelope * kinematics.velocity);
      seam[index] = Math.max(
        seam[index]!,
        eventEnvelope * (0.25 + 0.75 * Math.abs(Math.cos(kinematics.phase + mode.n * Math.PI))),
      );
    }
  }

  const modes = MOBIUS_CHOIR_DEFINITION.modes.map((mode, index) => {
    const laneY = (index * Math.PI) / MOBIUS_CHOIR_DEFINITION.modes.length;
    const kinematics = evaluateMobiusChoirModeKinematics(mode, laneY, absoluteTimeSeconds);
    const ambientDisplacement = kinematics.displacement;
    const ambientVelocity = kinematics.velocity;
    const normalizedEnergy = clamp01(
      Math.max(
        energy[index]! * 2.35,
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
    return {
      acousticEnergy: clamp01(energy[index]!),
      energy: normalizedEnergy,
      mathematicalDisplacement: ambientDisplacement,
      mathematicalVelocity: ambientVelocity,
      displacement: normalizedDisplacement,
      velocity: normalizedVelocity,
      ribbonWidth: clamp01(0.12 + normalizedEnergy * 0.52 + normalizedVelocity * 0.36),
      opacity: clamp01(0.08 + normalizedEnergy * 0.72 + normalizedDisplacement * 0.2),
      cyanRatio: clamp01(seamAfterglow * 0.76 + normalizedVelocity * 0.24),
      seamAfterglow,
    } satisfies MobiusChoirModeVisualResponse;
  });

  return {
    dramaturgy,
    collectiveEnergy: clamp01(collectiveEnergy * 1.8),
    onsetEnergy: clamp01(onsetEnergy),
    seamEnergy: clamp01(Math.max(...seam) * 2.1),
    modes,
  };
}
