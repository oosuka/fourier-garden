import type { PatternDefinition } from "./contracts";

function sameNumber(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-12;
}

function validateCommon(pattern: PatternDefinition): void {
  if (!pattern.id || !Number.isInteger(pattern.order) || pattern.order <= 0) {
    throw new Error("Pattern identity and order must be valid");
  }
  if (pattern.presentation.annotations.length !== 4) {
    throw new Error("Pattern presentation must provide four annotations");
  }
  if (pattern.audio.mode !== "sonification") {
    throw new Error("Pattern audio must be identified as sonification");
  }
  validateDramaturgy(pattern);
}

function validateDramaturgy(pattern: PatternDefinition): void {
  const dramaturgy = pattern.dramaturgy;
  if (!Number.isFinite(dramaturgy.cycleSeconds) || dramaturgy.cycleSeconds <= 0) {
    throw new Error("Pattern dramaturgy cycle must be positive");
  }
  if (!sameNumber(dramaturgy.cycleSeconds, pattern.audio.score.cycleSeconds)) {
    throw new Error("Pattern dramaturgy cycle must match the audio score cycle");
  }
  if (dramaturgy.sections.length < 3) {
    throw new Error("Pattern dramaturgy must provide at least three sections");
  }
  if (new Set(dramaturgy.expressiveAxes).size < 3) {
    throw new Error("Pattern dramaturgy must vary at least three expressive axes");
  }
  if (!dramaturgy.localMathMapping) {
    throw new Error("Pattern dramaturgy must declare a local mathematical mapping");
  }
  if (
    !dramaturgy.qualityContract ||
    Object.values(dramaturgy.qualityContract).some((requirement) => requirement !== true)
  ) {
    throw new Error("Pattern dramaturgy must declare every experience quality requirement");
  }

  let previousEnd = 0;
  for (const section of dramaturgy.sections) {
    const energies = [section.audioEnergy, section.visualEnergy, section.motionEnergy];
    if (
      !section.id ||
      !Number.isFinite(section.startRatio) ||
      !Number.isFinite(section.endRatio) ||
      section.startRatio < 0 ||
      section.endRatio > 1 ||
      Math.abs(section.startRatio - previousEnd) > 1e-12 ||
      section.endRatio <= section.startRatio ||
      energies.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
    ) {
      throw new Error("Pattern dramaturgy sections must continuously cover the cycle");
    }
    previousEnd = section.endRatio;
  }
  if (Math.abs(previousEnd - 1) > 1e-12) {
    throw new Error("Pattern dramaturgy sections must end at one");
  }

  const contrast = (key: "audioEnergy" | "visualEnergy" | "motionEnergy") => {
    const values = dramaturgy.sections.map((section) => section[key]);
    return Math.max(...values) - Math.min(...values);
  };
  if (
    [contrast("audioEnergy"), contrast("visualEnergy"), contrast("motionEnergy")].every(
      (value) => value < 0.25,
    )
  ) {
    throw new Error("Pattern dramaturgy must provide measurable contrast");
  }
}

export function validatePatternDefinition(pattern: PatternDefinition): void {
  validateCommon(pattern);
  pattern.validate();
}
