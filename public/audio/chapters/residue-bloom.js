import { clamp, isFiniteNumber, isPositiveFinite } from "./shared.js?v=20";

function evaluateSerializedPhasor(mapping, absoluteTimeSeconds, target) {
  const angle = absoluteTimeSeconds * mapping.visualAngularRate;
  let x = 0;
  let y = 0;

  for (const term of mapping.terms) {
    const phase = term.harmonic * angle + term.sinePhase;
    x += term.amplitude * Math.cos(phase);
    y += term.amplitude * Math.sin(phase);
  }

  target.normalizedX = clamp(x / mapping.amplitudeBound, -1, 1);
  target.normalizedY = clamp(y / mapping.amplitudeBound, -1, 1);
  target.normalizedRadius = clamp(Math.hypot(x, y) / mapping.amplitudeBound, 0, 1);
}

function evaluateEvent(score, event, cycleIndex, phasor, target) {
  const absoluteTimeSeconds =
    cycleIndex * score.cycleSeconds + event.globalStep * score.stepSeconds;
  evaluateSerializedPhasor(score.phasorMapping, absoluteTimeSeconds, phasor);
  const phasorBrightness = (phasor.normalizedY + 1) * 0.5;

  target.active = event.active;
  target.carrierHz = event.carrierHz;
  target.baseGain = event.baseGain;
  target.baseAccent = event.baseAccent;
  target.wetSend = event.wetSend;
  target.stereoSpread = event.stereoSpread;
  target.absoluteTimeSeconds = absoluteTimeSeconds;
  target.brightness = clamp(event.baseBrightness * 0.72 + phasorBrightness * 0.28, 0, 1);
  target.accent = event.active ? event.baseAccent * (0.9 + phasor.normalizedRadius * 0.2) : 0;
  target.normalizedPhasorX = phasor.normalizedX;
  target.normalizedPhasorY = phasor.normalizedY;
  target.normalizedPhasorRadius = phasor.normalizedRadius;
}

function createResidueBloomState() {
  return {
    filterLeft: 0,
    filterRight: 0,
    cachedCycleIndex: -1,
    cachedGlobalStep: -1,
    phasor: {
      normalizedX: 0,
      normalizedY: 0,
      normalizedRadius: 0,
    },
    cachedEvent: {
      active: false,
      carrierHz: 0,
      baseGain: 0,
      baseAccent: 0,
      wetSend: 0,
      stereoSpread: 0,
      absoluteTimeSeconds: 0,
      brightness: 0,
      accent: 0,
      normalizedPhasorX: 0,
      normalizedPhasorY: 0,
      normalizedPhasorRadius: 0,
    },
    sample: {
      dryLeft: 0,
      dryRight: 0,
      wetLeft: 0,
      wetRight: 0,
    },
  };
}

function resetResidueBloomState(state) {
  state.filterLeft = 0;
  state.filterRight = 0;
  state.cachedCycleIndex = -1;
  state.cachedGlobalStep = -1;
  state.sample.dryLeft = 0;
  state.sample.dryRight = 0;
  state.sample.wetLeft = 0;
  state.sample.wetRight = 0;
}

function renderResidueBloomSample(program, state, absoluteTime) {
  const score = program.score;
  const cycleTime = ((absoluteTime % score.cycleSeconds) + score.cycleSeconds) % score.cycleSeconds;
  const cycleIndex = Math.floor(Math.max(0, absoluteTime) / score.cycleSeconds);
  const globalStep = Math.min(score.totalSteps - 1, Math.floor(cycleTime / score.stepSeconds));
  const localTime = cycleTime - globalStep * score.stepSeconds;
  if (state.cachedCycleIndex !== cycleIndex || state.cachedGlobalStep !== globalStep) {
    state.cachedCycleIndex = cycleIndex;
    state.cachedGlobalStep = globalStep;
    const baseEvent = score.events[globalStep];
    evaluateEvent(score, baseEvent, cycleIndex, state.phasor, state.cachedEvent);
  }
  const event = state.cachedEvent;
  const sample = state.sample;
  const accentDecayScale = clamp(0.16 + event.baseAccent * 1.08, 0.52, 1.55);
  const decayScale = (0.88 + event.normalizedPhasorRadius * 0.24) * accentDecayScale;
  const attackProgress = Math.min(1, Math.max(0, localTime / score.definition.attackSeconds));
  const attackShape = attackProgress * attackProgress * (3 - 2 * attackProgress);
  const decay =
    localTime < score.definition.attackSeconds
      ? attackShape
      : Math.exp(
          -(localTime - score.definition.attackSeconds) /
            (score.definition.decaySeconds * decayScale),
        );
  const releaseProgress = Math.min(
    1,
    Math.max(0, (score.stepSeconds - localTime) / score.definition.releaseSeconds),
  );
  const releaseShape = releaseProgress * releaseProgress * (3 - 2 * releaseProgress);
  const envelope = event.active ? decay * releaseShape : 0;
  let leftSample = 0;
  let rightSample = 0;
  let normalization = 0;
  const frequencyLimit = sampleRate * 0.5 * score.definition.antiAliasRatio;
  const detune = score.definition.stereoDetuneRatio;

  if (event.active) {
    for (let index = 0; index < program.partials.length; index += 1) {
      const partial = program.partials[index];
      const nominalFrequency = event.carrierHz * partial.harmonic;
      const leftFrequency = nominalFrequency * (1 - detune);
      const rightFrequency = nominalFrequency * (1 + detune);
      if (Math.max(leftFrequency, rightFrequency) >= frequencyLimit) {
        continue;
      }
      const gain = partial.sourceAmplitude / Math.pow(index + 1, score.definition.timbreDamping);
      const leftPhase = Math.PI * 2 * leftFrequency * localTime + partial.sinePhase;
      const rightPhase = Math.PI * 2 * rightFrequency * localTime + partial.sinePhase;
      const eventPan = event.normalizedPhasorX * 0.28;
      const partialPan = Math.sin(index * 2.399963229728653) * 0.24 * event.stereoSpread;
      const pan = Math.min(0.92, Math.max(-0.92, eventPan + partialPan));
      const leftPanGain = Math.sqrt((1 - pan) * 0.5);
      const rightPanGain = Math.sqrt((1 + pan) * 0.5);
      leftSample += Math.sin(leftPhase) * gain * leftPanGain;
      rightSample += Math.sin(rightPhase) * gain * rightPanGain;
      normalization += gain;
    }
  }

  const scale =
    normalization > 0
      ? (score.definition.outputGain * envelope * event.baseGain * event.accent) / normalization
      : 0;
  const unfilteredLeft = leftSample * scale;
  const unfilteredRight = rightSample * scale;
  const minimumCutoffHz = 520;
  const maximumCutoffHz = Math.min(2_050, sampleRate * 0.2);
  const cutoffHz = minimumCutoffHz + (maximumCutoffHz - minimumCutoffHz) * event.brightness;
  const filterCoefficient = 1 - Math.exp((-2 * Math.PI * cutoffHz) / sampleRate);
  state.filterLeft += (unfilteredLeft - state.filterLeft) * filterCoefficient;
  state.filterRight += (unfilteredRight - state.filterRight) * filterCoefficient;

  if (!event.active) {
    sample.dryLeft = 0;
    sample.dryRight = 0;
    sample.wetLeft = 0;
    sample.wetRight = 0;
    return sample;
  }

  const wetScale = event.wetSend * 0.5;
  sample.dryLeft = state.filterLeft;
  sample.dryRight = state.filterRight;
  sample.wetLeft = state.filterLeft * wetScale;
  sample.wetRight = state.filterRight * wetScale;
  return sample;
}

function validateResidueBloomProgram(program) {
  const score = program.score;
  const definition = score?.definition;
  const phasorMapping = score?.phasorMapping;
  return (
    Array.isArray(program.partials) &&
    program.partials.length > 0 &&
    program.partials.every(
      (partial) =>
        isFiniteNumber(partial.harmonic) &&
        isFiniteNumber(partial.sourceFrequencyHz) &&
        isFiniteNumber(partial.sourceAmplitude) &&
        isFiniteNumber(partial.sinePhase),
    ) &&
    score &&
    isPositiveFinite(score.cycleSeconds) &&
    isPositiveFinite(score.stepSeconds) &&
    Number.isInteger(score.totalSteps) &&
    score.totalSteps > 0 &&
    Array.isArray(score.events) &&
    score.events.length === score.totalSteps &&
    score.events.every(
      (event) =>
        event &&
        Number.isInteger(event.globalStep) &&
        typeof event.active === "boolean" &&
        isFiniteNumber(event.carrierHz) &&
        isFiniteNumber(event.baseGain) &&
        isFiniteNumber(event.baseAccent) &&
        isFiniteNumber(event.baseBrightness) &&
        isFiniteNumber(event.wetSend) &&
        isFiniteNumber(event.stereoSpread),
    ) &&
    definition &&
    [
      definition.attackSeconds,
      definition.decaySeconds,
      definition.releaseSeconds,
      definition.antiAliasRatio,
      definition.stereoDetuneRatio,
      definition.timbreDamping,
      definition.outputGain,
    ].every(isPositiveFinite) &&
    phasorMapping &&
    isPositiveFinite(phasorMapping.amplitudeBound) &&
    isFiniteNumber(phasorMapping.visualAngularRate) &&
    Array.isArray(phasorMapping.terms) &&
    phasorMapping.terms.length > 0 &&
    phasorMapping.terms.every(
      (term) =>
        isFiniteNumber(term.harmonic) &&
        isFiniteNumber(term.amplitude) &&
        isFiniteNumber(term.sinePhase),
    )
  );
}

export const residueBloomProcessor = {
  kind: "residue-bloom",
  validate: validateResidueBloomProgram,
  createState: createResidueBloomState,
  resetState: resetResidueBloomState,
  render(program, state, absoluteTimeSeconds) {
    return renderResidueBloomSample(program, state, absoluteTimeSeconds);
  },
};
