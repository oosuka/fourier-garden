import { clamp, isFiniteNumber, isPositiveFinite } from "./shared.js?v=24";

const RESIDUE_TAU = Math.PI * 2;

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

function createResidueBloomState(program) {
  const partialCount = program.partials.length;
  const partialWeights = new Float64Array(partialCount);
  const partialPanBases = new Float64Array(partialCount);
  for (let index = 0; index < partialCount; index += 1) {
    partialWeights[index] =
      program.partials[index].sourceAmplitude /
      Math.pow(index + 1, program.score.definition.timbreDamping);
    partialPanBases[index] = Math.sin(index * 2.399963229728653) * 0.24;
  }
  return {
    filterLeft: 0,
    filterRight: 0,
    cachedCycleIndex: -1,
    cachedGlobalStep: -1,
    partialWeights,
    partialPanBases,
    activePartialCount: 0,
    eventScale: 0,
    decayDenominator: 1,
    filterCoefficient: 0,
    wetScale: 0,
    leftGains: new Float64Array(partialCount),
    rightGains: new Float64Array(partialCount),
    leftSines: new Float64Array(partialCount),
    leftCosines: new Float64Array(partialCount),
    rightSines: new Float64Array(partialCount),
    rightCosines: new Float64Array(partialCount),
    leftDeltaSines: new Float64Array(partialCount),
    leftDeltaCosines: new Float64Array(partialCount),
    rightDeltaSines: new Float64Array(partialCount),
    rightDeltaCosines: new Float64Array(partialCount),
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
  state.activePartialCount = 0;
  state.eventScale = 0;
  state.sample.dryLeft = 0;
  state.sample.dryRight = 0;
  state.sample.wetLeft = 0;
  state.sample.wetRight = 0;
}

function prepareResidueBloomEvent(program, state, localTime) {
  const score = program.score;
  const event = state.cachedEvent;
  const frequencyLimit = sampleRate * 0.5 * score.definition.antiAliasRatio;
  const detune = score.definition.stereoDetuneRatio;
  const eventPan = event.normalizedPhasorX * 0.28;
  let normalization = 0;
  let activePartialCount = 0;

  if (event.active) {
    for (let index = 0; index < program.partials.length; index += 1) {
      const partial = program.partials[index];
      const nominalFrequency = event.carrierHz * partial.harmonic;
      const leftFrequency = nominalFrequency * (1 - detune);
      const rightFrequency = nominalFrequency * (1 + detune);
      if (Math.max(leftFrequency, rightFrequency) >= frequencyLimit) continue;

      const weight = state.partialWeights[index];
      const partialPan = state.partialPanBases[index] * event.stereoSpread;
      const pan = clamp(eventPan + partialPan, -0.92, 0.92);
      const leftAngularFrequency = RESIDUE_TAU * leftFrequency;
      const rightAngularFrequency = RESIDUE_TAU * rightFrequency;
      const leftPhase = leftAngularFrequency * localTime + partial.sinePhase;
      const rightPhase = rightAngularFrequency * localTime + partial.sinePhase;
      const leftDelta = leftAngularFrequency / sampleRate;
      const rightDelta = rightAngularFrequency / sampleRate;

      state.leftGains[activePartialCount] = weight * Math.sqrt((1 - pan) * 0.5);
      state.rightGains[activePartialCount] = weight * Math.sqrt((1 + pan) * 0.5);
      state.leftSines[activePartialCount] = Math.sin(leftPhase);
      state.leftCosines[activePartialCount] = Math.cos(leftPhase);
      state.rightSines[activePartialCount] = Math.sin(rightPhase);
      state.rightCosines[activePartialCount] = Math.cos(rightPhase);
      state.leftDeltaSines[activePartialCount] = Math.sin(leftDelta);
      state.leftDeltaCosines[activePartialCount] = Math.cos(leftDelta);
      state.rightDeltaSines[activePartialCount] = Math.sin(rightDelta);
      state.rightDeltaCosines[activePartialCount] = Math.cos(rightDelta);
      normalization += weight;
      activePartialCount += 1;
    }
  }

  const accentDecayScale = clamp(0.16 + event.baseAccent * 1.08, 0.52, 1.55);
  const decayScale = (0.88 + event.normalizedPhasorRadius * 0.24) * accentDecayScale;
  const minimumCutoffHz = 520;
  const maximumCutoffHz = Math.min(2_050, sampleRate * 0.2);
  const cutoffHz = minimumCutoffHz + (maximumCutoffHz - minimumCutoffHz) * event.brightness;
  state.activePartialCount = activePartialCount;
  state.eventScale =
    normalization > 0
      ? (score.definition.outputGain * event.baseGain * event.accent) / normalization
      : 0;
  state.decayDenominator = score.definition.decaySeconds * decayScale;
  state.filterCoefficient = 1 - Math.exp((-RESIDUE_TAU * cutoffHz) / sampleRate);
  state.wetScale = event.wetSend * 0.5;
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
    prepareResidueBloomEvent(program, state, localTime);
  }
  const event = state.cachedEvent;
  const sample = state.sample;
  const attackProgress = Math.min(1, Math.max(0, localTime / score.definition.attackSeconds));
  const attackShape = attackProgress * attackProgress * (3 - 2 * attackProgress);
  const decay =
    localTime < score.definition.attackSeconds
      ? attackShape
      : Math.exp(-(localTime - score.definition.attackSeconds) / state.decayDenominator);
  const releaseProgress = Math.min(
    1,
    Math.max(0, (score.stepSeconds - localTime) / score.definition.releaseSeconds),
  );
  const releaseShape = releaseProgress * releaseProgress * (3 - 2 * releaseProgress);
  const envelope = event.active ? decay * releaseShape : 0;
  let leftSample = 0;
  let rightSample = 0;

  if (event.active) {
    for (let index = 0; index < state.activePartialCount; index += 1) {
      const leftSine = state.leftSines[index];
      const leftCosine = state.leftCosines[index];
      const rightSine = state.rightSines[index];
      const rightCosine = state.rightCosines[index];
      leftSample += leftSine * state.leftGains[index];
      rightSample += rightSine * state.rightGains[index];
      state.leftSines[index] =
        leftSine * state.leftDeltaCosines[index] + leftCosine * state.leftDeltaSines[index];
      state.leftCosines[index] =
        leftCosine * state.leftDeltaCosines[index] - leftSine * state.leftDeltaSines[index];
      state.rightSines[index] =
        rightSine * state.rightDeltaCosines[index] + rightCosine * state.rightDeltaSines[index];
      state.rightCosines[index] =
        rightCosine * state.rightDeltaCosines[index] - rightSine * state.rightDeltaSines[index];
    }
  }

  const scale = state.eventScale * envelope;
  const unfilteredLeft = leftSample * scale;
  const unfilteredRight = rightSample * scale;
  state.filterLeft += (unfilteredLeft - state.filterLeft) * state.filterCoefficient;
  state.filterRight += (unfilteredRight - state.filterRight) * state.filterCoefficient;

  if (!event.active) {
    sample.dryLeft = 0;
    sample.dryRight = 0;
    sample.wetLeft = 0;
    sample.wetRight = 0;
    return sample;
  }

  sample.dryLeft = state.filterLeft;
  sample.dryRight = state.filterRight;
  sample.wetLeft = state.filterLeft * state.wetScale;
  sample.wetRight = state.filterRight * state.wetScale;
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
