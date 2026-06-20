function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveFinite(value) {
  return isFiniteNumber(value) && value > 0;
}

function isNonnegativeFinite(value) {
  return isFiniteNumber(value) && value >= 0;
}

function evaluateSerializedPhasor(mapping, absoluteTimeSeconds) {
  const angle = absoluteTimeSeconds * mapping.visualAngularRate;
  let x = 0;
  let y = 0;

  for (const term of mapping.terms) {
    const phase = term.harmonic * angle + term.sinePhase;
    x += term.amplitude * Math.cos(phase);
    y += term.amplitude * Math.sin(phase);
  }

  return {
    normalizedX: clamp(x / mapping.amplitudeBound, -1, 1),
    normalizedY: clamp(y / mapping.amplitudeBound, -1, 1),
    normalizedRadius: clamp(Math.hypot(x, y) / mapping.amplitudeBound, 0, 1),
  };
}

function evaluateEvent(score, event, cycleIndex) {
  const absoluteTimeSeconds =
    cycleIndex * score.cycleSeconds + event.globalStep * score.stepSeconds;
  const phasor = evaluateSerializedPhasor(score.phasorMapping, absoluteTimeSeconds);
  const phasorBrightness = (phasor.normalizedY + 1) * 0.5;

  return {
    ...event,
    absoluteTimeSeconds,
    brightness: clamp(event.baseBrightness * 0.72 + phasorBrightness * 0.28, 0, 1),
    accent: event.active ? event.baseAccent * (0.9 + phasor.normalizedRadius * 0.2) : 0,
    normalizedPhasorX: phasor.normalizedX,
    normalizedPhasorY: phasor.normalizedY,
    normalizedPhasorRadius: phasor.normalizedRadius,
  };
}

function createResidueBloomState() {
  return {
    filterLeft: 0,
    filterRight: 0,
    cachedEventKey: "",
    cachedEvent: null,
  };
}

function resetResidueBloomState(state) {
  state.filterLeft = 0;
  state.filterRight = 0;
  state.cachedEventKey = "";
  state.cachedEvent = null;
}

function renderResidueBloomSample(program, state, absoluteTime) {
  const score = program.score;
  const cycleTime = ((absoluteTime % score.cycleSeconds) + score.cycleSeconds) % score.cycleSeconds;
  const cycleIndex = Math.floor(Math.max(0, absoluteTime) / score.cycleSeconds);
  const globalStep = Math.min(score.totalSteps - 1, Math.floor(cycleTime / score.stepSeconds));
  const localTime = cycleTime - globalStep * score.stepSeconds;
  const eventKey = `${cycleIndex}:${globalStep}`;
  if (state.cachedEventKey !== eventKey) {
    state.cachedEventKey = eventKey;
    const baseEvent = score.events[globalStep];
    state.cachedEvent = evaluateEvent(score, baseEvent, cycleIndex);
  }
  const event = state.cachedEvent;
  const decayScale = 0.88 + event.normalizedPhasorRadius * 0.24;
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
  const minimumCutoffHz = 1_800;
  const maximumCutoffHz = Math.min(6_200, sampleRate * 0.18);
  const cutoffHz = minimumCutoffHz + (maximumCutoffHz - minimumCutoffHz) * event.brightness;
  const filterCoefficient = 1 - Math.exp((-2 * Math.PI * cutoffHz) / sampleRate);
  state.filterLeft += (unfilteredLeft - state.filterLeft) * filterCoefficient;
  state.filterRight += (unfilteredRight - state.filterRight) * filterCoefficient;

  if (!event.active) {
    return { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 };
  }

  const wetScale = event.wetSend * 0.5;
  return {
    dryLeft: state.filterLeft,
    dryRight: state.filterRight,
    wetLeft: state.filterLeft * wetScale,
    wetRight: state.filterRight * wetScale,
  };
}

function evaluateSpectralCathedralEvents(score, absoluteTimeSeconds, maximumAgeSeconds) {
  if (
    !Number.isFinite(absoluteTimeSeconds) ||
    !Number.isFinite(maximumAgeSeconds) ||
    absoluteTimeSeconds < 0 ||
    maximumAgeSeconds <= 0
  ) {
    return [];
  }

  const currentCycleIndex = Math.floor(absoluteTimeSeconds / score.cycleSeconds);
  const evaluated = [];

  for (const cycleIndex of [currentCycleIndex - 1, currentCycleIndex]) {
    if (cycleIndex < 0) continue;

    for (const event of score.events) {
      const eventTimeSeconds = cycleIndex * score.cycleSeconds + event.localTimeSeconds;
      const ageSeconds = absoluteTimeSeconds - eventTimeSeconds;
      if (ageSeconds < 0 || ageSeconds >= maximumAgeSeconds) continue;

      evaluated.push({
        ...event,
        cycleIndex,
        absoluteEventIndex: cycleIndex * score.events.length + event.index,
        absoluteTimeSeconds: eventTimeSeconds,
        ageSeconds,
      });
    }
  }

  return evaluated.toSorted((left, right) => left.absoluteTimeSeconds - right.absoluteTimeSeconds);
}

function getEqualPowerPanGains(pan) {
  const clampedPan = Math.max(-1, Math.min(1, pan));
  return [Math.sqrt((1 - clampedPan) / 2), Math.sqrt((1 + clampedPan) / 2)];
}

function getSpectralCathedralBellEnvelope(ageSeconds, gesture, preset, decayScale) {
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

function getSpectralCathedralModeExpression(mode, absoluteEventTimeSeconds) {
  const phase = mode.modalAngularFrequency * absoluteEventTimeSeconds;
  return {
    displacement: Math.abs(Math.cos(phase)),
    velocity: Math.abs(Math.sin(phase)),
  };
}

function evaluateSpectralCathedralEventExpression(event, modes) {
  const selected = modes.filter((mode) => event.modeIds.includes(mode.id));
  if (selected.length === 0) return null;
  const displacement =
    selected.reduce(
      (sum, mode) =>
        sum + getSpectralCathedralModeExpression(mode, event.absoluteTimeSeconds).displacement,
      0,
    ) / selected.length;
  const velocity =
    selected.reduce(
      (sum, mode) =>
        sum + getSpectralCathedralModeExpression(mode, event.absoluteTimeSeconds).velocity,
      0,
    ) / selected.length;
  return {
    brightness: Math.min(1, event.baseBrightness * (0.78 + velocity * 0.38)),
    wetSend: Math.min(1, event.wetSend * (0.8 + displacement * 0.32)),
    woodScale: 0.72 + velocity * 0.56,
    decayScale: 0.82 + displacement * 0.38,
  };
}

function hashUint32(value) {
  let hash = value >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function hashUnit(absoluteEventIndex, modeId, component, salt) {
  const seed =
    Math.imul(absoluteEventIndex + 1, 0x9e3779b1) ^
    Math.imul(modeId + 1, 0x85ebca6b) ^
    Math.imul(component + 1, 0xc2b2ae35) ^
    salt;
  return hashUint32(seed) / 0x1_0000_0000;
}

function getSpectralCathedralWoodAttack(absoluteEventIndex, modeId, ageSeconds, preset) {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || ageSeconds >= preset.woodAttackSeconds) {
    return 0;
  }

  let value = 0;
  let normalization = 0;

  for (let component = 0; component < preset.woodComponentCount; component += 1) {
    const weight = 1 / Math.sqrt(component + 1);
    const frequencyUnit = hashUnit(absoluteEventIndex, modeId, component, 0x68bc21eb);
    const phaseUnit = hashUnit(absoluteEventIndex, modeId, component, 0x02e5be93);
    const frequencyHz =
      preset.woodMinimumHz + (preset.woodMaximumHz - preset.woodMinimumHz) * frequencyUnit;
    value += weight * Math.sin(Math.PI * 2 * frequencyHz * ageSeconds + Math.PI * 2 * phaseUnit);
    normalization += weight;
  }

  const envelope = Math.sin((Math.PI * ageSeconds) / preset.woodAttackSeconds) ** 2;
  return normalization > 0 ? (value / normalization) * envelope : 0;
}

function renderSpectralCathedralModeVoice(mode, pan, event, expression, preset) {
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
  return [
    mode.normalizedGain * panLeft * (bellLeft * bellEnvelope + wood),
    mode.normalizedGain * panRight * (bellRight * bellEnvelope + wood),
  ];
}

function renderSpectralCathedralSample(program, absoluteTimeSeconds) {
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

  for (const event of events) {
    let eventLeft = 0;
    let eventRight = 0;
    const expression = evaluateSpectralCathedralEventExpression(event, program.modes);
    if (!expression) {
      return {
        dryLeft: Number.NaN,
        dryRight: Number.NaN,
        wetLeft: Number.NaN,
        wetRight: Number.NaN,
      };
    }
    for (const [voiceIndex, modeId] of event.modeIds.entries()) {
      const mode = program.modes.find((candidate) => candidate.id === modeId);
      if (!mode) {
        return {
          dryLeft: Number.NaN,
          dryRight: Number.NaN,
          wetLeft: Number.NaN,
          wetRight: Number.NaN,
        };
      }
      const centeredPan =
        event.modeIds.length === 1 ? 0 : (voiceIndex / (event.modeIds.length - 1)) * 2 - 1;
      const pan = centeredPan * event.stereoSpread;
      const [voiceLeft, voiceRight] = renderSpectralCathedralModeVoice(
        mode,
        pan,
        event,
        expression,
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

function validateSpectralCathedralProgram(program) {
  const preset = program.synthesis;
  const score = program.score;
  const modes = program.modes;
  const modeIds = Array.isArray(modes) ? new Set(modes.map((mode) => mode.id)) : new Set();
  const gestureIds = ["toll", "answer", "cascade", "pulse", "choir"];
  return (
    score &&
    isPositiveFinite(score.cycleSeconds) &&
    isPositiveFinite(score.beatSeconds) &&
    isPositiveFinite(score.barSeconds) &&
    Array.isArray(score.events) &&
    score.events.length === 95 &&
    score.events.every(
      (event) =>
        event &&
        Number.isInteger(event.index) &&
        Number.isInteger(event.barIndex) &&
        Number.isInteger(event.slotInBar) &&
        event.slotInBar >= 0 &&
        event.slotInBar < 10 &&
        typeof event.section === "string" &&
        gestureIds.includes(event.gesture) &&
        Array.isArray(event.modeIds) &&
        event.modeIds.length > 0 &&
        event.modeIds.length <= 4 &&
        event.modeIds.every((modeId) => Number.isInteger(modeId) && modeIds.has(modeId)) &&
        isNonnegativeFinite(event.localTimeSeconds) &&
        event.localTimeSeconds < score.cycleSeconds &&
        isNonnegativeFinite(event.baseGain) &&
        isNonnegativeFinite(event.baseBrightness) &&
        event.baseBrightness <= 1 &&
        isNonnegativeFinite(event.wetSend) &&
        event.wetSend <= 1 &&
        isNonnegativeFinite(event.stereoSpread) &&
        event.stereoSpread <= 1 &&
        [0.5, 1, 2].includes(event.registerMultiplier),
    ) &&
    Array.isArray(modes) &&
    modes.length === 12 &&
    modeIds.size === modes.length &&
    modes.every(
      (mode) =>
        Number.isInteger(mode.id) &&
        isPositiveFinite(mode.eigenvalue) &&
        isFiniteNumber(mode.coefficient) &&
        isPositiveFinite(mode.baseFrequencyHz) &&
        isNonnegativeFinite(mode.normalizedGain) &&
        isPositiveFinite(mode.modalAngularFrequency) &&
        (mode.coefficientPhaseOffset === 0 || mode.coefficientPhaseOffset === Math.PI),
    ) &&
    preset &&
    Number.isInteger(preset.maximumPartials) &&
    preset.maximumPartials > 0 &&
    Number.isInteger(preset.woodComponentCount) &&
    preset.woodComponentCount > 0 &&
    [
      preset.partialDamping,
      preset.maximumEventSeconds,
      preset.woodAttackSeconds,
      preset.woodMinimumHz,
      preset.woodMaximumHz,
      preset.outputGain,
      program.normalization,
    ].every(isPositiveFinite) &&
    preset.articulations &&
    gestureIds.every((gesture) => {
      const articulation = preset.articulations[gesture];
      return (
        articulation &&
        isPositiveFinite(articulation.attackSeconds) &&
        isPositiveFinite(articulation.decaySeconds) &&
        isNonnegativeFinite(articulation.fadeStartSeconds) &&
        isPositiveFinite(articulation.endSeconds) &&
        articulation.fadeStartSeconds < articulation.endSeconds &&
        isNonnegativeFinite(articulation.woodAttackGain)
      );
    }) &&
    preset.woodMinimumHz <= preset.woodMaximumHz &&
    isNonnegativeFinite(preset.stereoDetuneRatio) &&
    preset.stereoDetuneRatio < 1 &&
    isPositiveFinite(preset.antiAliasRatio) &&
    preset.antiAliasRatio <= 1
  );
}

function validateProgram(program) {
  if (!program || typeof program !== "object") return false;
  if (program.kind === "residue-bloom") {
    return validateResidueBloomProgram(program);
  }
  if (program.kind === "spectral-cathedral") {
    return validateSpectralCathedralProgram(program);
  }
  return false;
}

class FourierGardenProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.program = null;
    this.active = false;
    this.sampleCursor = 0;
    this.fade = 0;
    this.hasReportedProgramError = false;
    this.residueBloomState = createResidueBloomState();

    this.port.onmessage = ({ data }) => {
      if (!data || typeof data !== "object") return;
      if (data.type === "configure") {
        this.configure(data.program);
      }
      if (data.type === "active") {
        this.active = data.value;
      }
      if (data.type === "seek") {
        if (isFiniteNumber(data.seconds)) {
          this.sampleCursor = Math.max(0, Math.round(data.seconds * sampleRate));
          resetResidueBloomState(this.residueBloomState);
        }
      }
    };
  }

  configure(program) {
    this.program = null;
    this.sampleCursor = 0;
    this.fade = 0;
    this.hasReportedProgramError = false;
    resetResidueBloomState(this.residueBloomState);

    if (!validateProgram(program)) {
      this.reportProgramError("Invalid or unsupported audio worklet program");
      return;
    }
    this.program = program;
  }

  reportProgramError(message) {
    if (this.hasReportedProgramError) return;
    this.hasReportedProgramError = true;
    this.port.postMessage({ type: "error", message });
  }

  disableProgram(message) {
    this.program = null;
    resetResidueBloomState(this.residueBloomState);
    this.reportProgramError(message);
  }

  process(_inputs, outputs) {
    const dryOutput = outputs[0];
    const wetOutput = outputs[1];
    const dryLeft = dryOutput[0];
    const dryRight = dryOutput[1] ?? dryOutput[0];
    const wetLeft = wetOutput[0];
    const wetRight = wetOutput[1] ?? wetOutput[0];
    const target = this.active ? 1 : 0;

    for (let frame = 0; frame < dryLeft.length; frame += 1) {
      this.fade += (target - this.fade) * 0.0018;
      const program = this.program;
      if (!program) {
        dryLeft[frame] = 0;
        dryRight[frame] = 0;
        wetLeft[frame] = 0;
        wetRight[frame] = 0;
        continue;
      }

      const absoluteTimeSeconds = this.sampleCursor / sampleRate;
      let rendered;
      if (program.kind === "residue-bloom") {
        rendered = renderResidueBloomSample(program, this.residueBloomState, absoluteTimeSeconds);
      } else if (program.kind === "spectral-cathedral") {
        rendered = renderSpectralCathedralSample(program, absoluteTimeSeconds);
      } else {
        this.disableProgram("Unsupported audio worklet program");
        rendered = { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 };
      }

      if (
        !isFiniteNumber(rendered.dryLeft) ||
        !isFiniteNumber(rendered.dryRight) ||
        !isFiniteNumber(rendered.wetLeft) ||
        !isFiniteNumber(rendered.wetRight)
      ) {
        this.disableProgram("Audio worklet produced a non-finite sample");
        rendered = { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 };
      }

      dryLeft[frame] = rendered.dryLeft * this.fade;
      dryRight[frame] = rendered.dryRight * this.fade;
      wetLeft[frame] = rendered.wetLeft * this.fade;
      wetRight[frame] = rendered.wetRight * this.fade;

      if (this.active || this.fade > 0.0001) {
        this.sampleCursor += 1;
      }
    }

    return true;
  }
}

registerProcessor("fourier-garden-processor", FourierGardenProcessor);
