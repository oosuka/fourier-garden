import {
  getEqualPowerPanGains,
  hashUint32,
  isNonnegativeFinite,
  isPositiveFinite,
} from "./shared.js?v=15";

function smoothstepMobius(value) {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function getMobiusChoirAbsoluteCarrierPhase(
  frequencyHz,
  partial,
  modalAngularFrequency,
  voicePhaseOffset,
  absoluteTimeSeconds,
) {
  return (
    Math.PI * 2 * frequencyHz * absoluteTimeSeconds +
    partial * (modalAngularFrequency * absoluteTimeSeconds + voicePhaseOffset)
  );
}

function getMobiusChoirContinuousAmplitude(phase, depth) {
  return 1 - depth / 2 + depth * Math.abs(Math.cos(phase));
}

function getMobiusChoirContinuousBrightness(phase, depth, partialPosition) {
  return 1 + depth * (Math.abs(Math.sin(phase)) - 0.5) * partialPosition;
}

function getMobiusChoirContinuousPan(basePan, phase, panMotion) {
  return Math.min(1, Math.max(-1, basePan + Math.sin(phase) * panMotion));
}

function getMobiusChoirFormantWeight(vowel, frequencyHz, preset) {
  return preset.formants[vowel].reduce((sum, band) => {
    const normalized = (frequencyHz - band.frequencyHz) / band.bandwidthHz;
    return sum + band.amplitude * Math.exp(-0.5 * normalized * normalized);
  }, preset.formantFloor);
}

function hashMobiusUnit(eventIndex, modeId, voiceIndex, component) {
  const seed =
    Math.imul(eventIndex + 1, 0x9e3779b1) ^
    Math.imul(modeId + 1, 0x85ebca6b) ^
    Math.imul(voiceIndex + 1, 0xc2b2ae35) ^
    Math.imul(component + 1, 0x27d4eb2f);
  return hashUint32(seed) / 0x1_0000_0000;
}

function getMobiusLowCutWeight(frequencyHz) {
  const ratio = Math.max(0, frequencyHz) / 360;
  const squared = ratio * ratio;
  return squared / Math.sqrt(1 + squared * squared);
}

function getMobiusChoirVoicePan(event, modeIndex, voiceIndex, voiceCount) {
  const modeCount = event.modeIds.length;
  const center =
    modeCount === 1
      ? 0
      : -0.45 * event.stereoSpread +
        (modeIndex / Math.max(1, modeCount - 1)) * 0.9 * event.stereoSpread;
  return voiceCount === 1 ? center : center + (voiceIndex === 0 ? -0.3 : 0.3) * event.stereoSpread;
}

function createMobiusChoirRuntime(program) {
  const synthesis = program.synthesis;
  const frequencyLimit = sampleRate * 0.5 * synthesis.antiAliasRatio;
  const events = [];
  for (let eventIndex = 0; eventIndex < program.score.events.length; eventIndex += 1) {
    const event = program.score.events[eventIndex];
    const voices = [];
    for (let modeIndex = 0; modeIndex < event.modeIds.length; modeIndex += 1) {
      const modeId = event.modeIds[modeIndex];
      const mode = program.modes.find((candidate) => candidate.id === modeId);
      if (!mode) return null;
      const voiceCount = mode.voiceKind === "single" ? 1 : 2;
      for (let voiceIndex = 0; voiceIndex < voiceCount; voiceIndex += 1) {
        const partials = [];
        for (
          let partial = 1;
          partial <= Math.min(synthesis.maximumPartials, event.partialCount);
          partial += 1
        ) {
          const leftFrequencyHz =
            mode.baseFrequencyHz *
            event.registerMultiplier *
            partial *
            (1 - synthesis.stereoDetuneRatio);
          const rightFrequencyHz =
            mode.baseFrequencyHz *
            event.registerMultiplier *
            partial *
            (1 + synthesis.stereoDetuneRatio);
          if (Math.max(leftFrequencyHz, rightFrequencyHz) >= frequencyLimit) continue;
          const averageFrequencyHz = (leftFrequencyHz + rightFrequencyHz) * 0.5;
          partials.push({
            partial,
            leftFrequencyHz,
            rightFrequencyHz,
            baseWeight:
              partial ** -synthesis.partialDamping * getMobiusLowCutWeight(averageFrequencyHz),
            startWeight: getMobiusChoirFormantWeight(
              event.vowelStart,
              averageFrequencyHz,
              synthesis,
            ),
            endWeight: getMobiusChoirFormantWeight(event.vowelEnd, averageFrequencyHz, synthesis),
          });
        }
        const breath = [];
        let breathNormalization = 0;
        for (let component = 0; component < synthesis.breathComponentCount; component += 1) {
          const frequencyHz =
            synthesis.breathMinimumHz +
            (synthesis.breathMaximumHz - synthesis.breathMinimumHz) *
              hashMobiusUnit(event.index, mode.id, voiceIndex, component);
          if (frequencyHz >= frequencyLimit) continue;
          const weight = 1 / Math.sqrt(component + 1);
          breath.push({
            frequencyHz,
            phase: Math.PI * 2 * hashMobiusUnit(event.index, mode.id, voiceIndex + 7, component),
            weight,
          });
          breathNormalization += weight;
        }
        const pan = getMobiusChoirVoicePan(event, modeIndex, voiceIndex, voiceCount);
        const panGains = getEqualPowerPanGains(pan);
        voices.push({
          modeId: mode.id,
          modalAngularFrequency: mode.modalAngularFrequency,
          normalizedGain: mode.normalizedGain,
          phaseOffset: voiceIndex === 0 ? 0 : -Math.PI / 2,
          basePan: pan,
          controlPhaseOffset: mode.n * (((mode.id - 1) * Math.PI) / program.modes.length),
          panLeft: panGains[0],
          panRight: panGains[1],
          partials,
          breath,
          breathNormalization,
        });
      }
    }
    const articulation = synthesis.articulations[event.gesture];
    events.push({
      localTimeSeconds: event.localTimeSeconds,
      gesture: event.gesture,
      baseGain: event.baseGain,
      wetSend: event.wetSend,
      attackSeconds: articulation.attackSeconds,
      decaySeconds: articulation.decaySeconds,
      fadeStartSeconds: articulation.fadeStartSeconds,
      endSeconds: articulation.endSeconds,
      breathGain: articulation.breathGain,
      mora: articulation.moraOffsetsSeconds.map((offsetSeconds, index) => ({
        offsetSeconds,
        gain: articulation.moraGains[index],
      })),
      partialCount: event.partialCount,
      amplitudeMotionDepth: event.amplitudeMotionDepth,
      brightnessMotionDepth: event.brightnessMotionDepth,
      panMotion: event.panMotion,
      voices,
    });
  }
  return {
    cycleSeconds: program.score.cycleSeconds,
    maximumEventSeconds: synthesis.maximumEventSeconds,
    breathSeconds: synthesis.breathSeconds,
    outputGain: synthesis.outputGain,
    normalization: program.normalization,
    events,
  };
}

function renderMobiusChoirBreath(voice, ageSeconds, preset) {
  if (ageSeconds <= 0 || ageSeconds >= preset.breathSeconds || voice.breathNormalization <= 0) {
    return 0;
  }
  let value = 0;
  for (let index = 0; index < voice.breath.length; index += 1) {
    const component = voice.breath[index];
    value +=
      component.weight *
      Math.sin(Math.PI * 2 * component.frequencyHz * ageSeconds + component.phase);
  }
  const envelope = Math.sin((Math.PI * ageSeconds) / preset.breathSeconds) ** 2;
  return (value / voice.breathNormalization) * envelope;
}

function getMobiusContinuityEnvelope(ageSeconds, maximumEventSeconds) {
  if (ageSeconds <= 0 || ageSeconds >= maximumEventSeconds) return 0;
  const progress = ageSeconds / maximumEventSeconds;
  return Math.sin(Math.PI * progress) ** 2 * Math.exp(-ageSeconds * 0.22);
}

function renderMobiusChoirAir(voice, absoluteTimeSeconds) {
  if (voice.breathNormalization <= 0) return 0;
  let value = 0;
  for (let index = 0; index < voice.breath.length; index += 1) {
    const component = voice.breath[index];
    value +=
      component.weight *
      Math.sin(Math.PI * 2 * component.frequencyHz * absoluteTimeSeconds + component.phase);
  }
  return value / voice.breathNormalization;
}

function getMobiusChoirRuntimeEnvelope(
  ageSeconds,
  attackSeconds,
  decaySeconds,
  fadeStartSeconds,
  endSeconds,
) {
  if (!Number.isFinite(ageSeconds) || ageSeconds <= 0 || ageSeconds >= endSeconds) return 0;
  const body = (1 - Math.exp(-ageSeconds / attackSeconds)) * Math.exp(-ageSeconds / decaySeconds);
  if (ageSeconds < fadeStartSeconds) return body;
  const progress = (ageSeconds - fadeStartSeconds) / (endSeconds - fadeStartSeconds);
  return body * 0.5 * (1 + Math.cos(Math.PI * progress));
}

function findLatestMobiusChoirEventIndex(events, localTimeSeconds) {
  let low = 0;
  let high = events.length - 1;
  let latest = -1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (events[middle].localTimeSeconds <= localTimeSeconds) {
      latest = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return latest;
}

function accumulateMobiusChoirEvent(
  program,
  runtime,
  event,
  absoluteEventTimeSeconds,
  absoluteTimeSeconds,
  target,
) {
  const ageSeconds = absoluteTimeSeconds - absoluteEventTimeSeconds;
  if (ageSeconds <= 0 || ageSeconds >= runtime.maximumEventSeconds) return;
  let eventLeft = 0;
  let eventRight = 0;

  for (let moraIndex = 0; moraIndex < event.mora.length; moraIndex += 1) {
    const mora = event.mora[moraIndex];
    const moraAgeSeconds = ageSeconds - mora.offsetSeconds;
    const envelope =
      getMobiusChoirRuntimeEnvelope(
        moraAgeSeconds,
        event.attackSeconds,
        event.decaySeconds,
        event.fadeStartSeconds,
        event.endSeconds,
      ) * mora.gain;
    if (envelope <= 0) continue;
    const vowelProgress = smoothstepMobius(moraAgeSeconds / event.fadeStartSeconds);

    for (let voiceIndex = 0; voiceIndex < event.voices.length; voiceIndex += 1) {
      const voice = event.voices[voiceIndex];
      const controlPhase =
        voice.controlPhaseOffset - voice.modalAngularFrequency * absoluteTimeSeconds;
      const amplitude = getMobiusChoirContinuousAmplitude(controlPhase, event.amplitudeMotionDepth);
      const pan = getMobiusChoirContinuousPan(voice.basePan, controlPhase, event.panMotion);
      const panLeft = Math.sqrt((1 - pan) / 2);
      const panRight = Math.sqrt((1 + pan) / 2);
      let voiceLeft = 0;
      let voiceRight = 0;
      for (let partialIndex = 0; partialIndex < voice.partials.length; partialIndex += 1) {
        const partial = voice.partials[partialIndex];
        const partialPosition = (partial.partial - 1) / Math.max(1, event.partialCount - 1);
        const brightness = getMobiusChoirContinuousBrightness(
          controlPhase,
          event.brightnessMotionDepth,
          partialPosition,
        );
        const weight =
          partial.baseWeight *
          (partial.startWeight + (partial.endWeight - partial.startWeight) * vowelProgress) *
          brightness;
        voiceLeft +=
          weight *
          Math.cos(
            getMobiusChoirAbsoluteCarrierPhase(
              partial.leftFrequencyHz,
              partial.partial,
              voice.modalAngularFrequency,
              voice.phaseOffset,
              absoluteTimeSeconds,
            ),
          );
        voiceRight +=
          weight *
          Math.cos(
            getMobiusChoirAbsoluteCarrierPhase(
              partial.rightFrequencyHz,
              partial.partial,
              voice.modalAngularFrequency,
              voice.phaseOffset,
              absoluteTimeSeconds,
            ),
          );
      }
      const breath =
        event.breathGain *
        mora.gain *
        renderMobiusChoirBreath(voice, moraAgeSeconds, program.synthesis);
      eventLeft += voice.normalizedGain * panLeft * (voiceLeft * envelope * amplitude + breath);
      eventRight += voice.normalizedGain * panRight * (voiceRight * envelope * amplitude + breath);
    }
  }

  const airEnvelope =
    getMobiusContinuityEnvelope(ageSeconds, runtime.maximumEventSeconds) * event.breathGain * 0.035;
  if (airEnvelope > 0) {
    for (let voiceIndex = 0; voiceIndex < event.voices.length; voiceIndex += 1) {
      const voice = event.voices[voiceIndex];
      const air = renderMobiusChoirAir(voice, absoluteTimeSeconds);
      eventLeft += voice.normalizedGain * voice.panLeft * air * airEnvelope;
      eventRight += voice.normalizedGain * voice.panRight * air * airEnvelope;
    }
  }
  const scale = (runtime.outputGain * event.baseGain) / runtime.normalization;
  target.dryLeft += eventLeft * scale;
  target.dryRight += eventRight * scale;
  target.wetLeft += eventLeft * scale * event.wetSend;
  target.wetRight += eventRight * scale * event.wetSend;
}

function renderMobiusChoirSample(program, runtime, absoluteTimeSeconds, target) {
  target.dryLeft = 0;
  target.dryRight = 0;
  target.wetLeft = 0;
  target.wetRight = 0;
  const currentCycleIndex = Math.floor(absoluteTimeSeconds / runtime.cycleSeconds);
  const currentCycleStart = currentCycleIndex * runtime.cycleSeconds;
  const localTimeSeconds = absoluteTimeSeconds - currentCycleStart;
  const latestIndex = findLatestMobiusChoirEventIndex(runtime.events, localTimeSeconds);
  for (let index = latestIndex; index >= 0; index -= 1) {
    const event = runtime.events[index];
    const absoluteEventTimeSeconds = currentCycleStart + event.localTimeSeconds;
    if (absoluteTimeSeconds - absoluteEventTimeSeconds >= runtime.maximumEventSeconds) break;
    accumulateMobiusChoirEvent(
      program,
      runtime,
      event,
      absoluteEventTimeSeconds,
      absoluteTimeSeconds,
      target,
    );
  }
  if (currentCycleIndex > 0 && localTimeSeconds < runtime.maximumEventSeconds) {
    const previousCycleStart = currentCycleStart - runtime.cycleSeconds;
    for (let index = runtime.events.length - 1; index >= 0; index -= 1) {
      const event = runtime.events[index];
      const absoluteEventTimeSeconds = previousCycleStart + event.localTimeSeconds;
      if (absoluteTimeSeconds - absoluteEventTimeSeconds >= runtime.maximumEventSeconds) break;
      accumulateMobiusChoirEvent(
        program,
        runtime,
        event,
        absoluteEventTimeSeconds,
        absoluteTimeSeconds,
        target,
      );
    }
  }

  const limiterCeiling = 10 ** (-1 / 20);
  target.dryLeft = Math.max(-limiterCeiling, Math.min(limiterCeiling, target.dryLeft));
  target.dryRight = Math.max(-limiterCeiling, Math.min(limiterCeiling, target.dryRight));
  target.wetLeft = Math.max(-limiterCeiling, Math.min(limiterCeiling, target.wetLeft));
  target.wetRight = Math.max(-limiterCeiling, Math.min(limiterCeiling, target.wetRight));
}

function validateMobiusChoirProgram(program) {
  const score = program.score;
  const modes = program.modes;
  const preset = program.synthesis;
  const modeIds = Array.isArray(modes) ? new Set(modes.map((mode) => mode.id)) : new Set();
  const gestures = ["breath", "call", "answer", "turn", "braid", "converge"];
  const vowels = ["u", "o", "e", "a"];
  const allowedModeSets = new Set(["1", "2", "3", "4", "5", "6", "1,4", "2,3", "5,6"]);
  return (
    score &&
    Math.abs(score.cycleSeconds - 960 / 17) <= 1e-12 &&
    Array.isArray(score.events) &&
    score.events.length === 256 &&
    Array.isArray(modes) &&
    modes.length === 6 &&
    modeIds.size === 6 &&
    modes.every(
      (mode) =>
        Number.isInteger(mode.id) &&
        Number.isInteger(mode.m) &&
        mode.m > 0 &&
        Number.isInteger(mode.n) &&
        mode.n >= 0 &&
        isPositiveFinite(mode.eigenvalue) &&
        isPositiveFinite(mode.coefficient) &&
        isPositiveFinite(mode.baseFrequencyHz) &&
        isNonnegativeFinite(mode.normalizedGain) &&
        isPositiveFinite(mode.modalAngularFrequency) &&
        ((mode.n === 0 && mode.voiceKind === "single") ||
          (mode.n > 0 && mode.voiceKind === "quadrature-pair")),
    ) &&
    score.events.every(
      (event) =>
        Number.isInteger(event.index) &&
        Number.isInteger(event.barIndex) &&
        Number.isInteger(event.slotInBar) &&
        event.slotInBar >= 0 &&
        event.slotInBar < 16 &&
        gestures.includes(event.gesture) &&
        Array.isArray(event.modeIds) &&
        event.modeIds.length > 0 &&
        event.modeIds.length <= 2 &&
        event.modeIds.every((modeId) => Number.isInteger(modeId) && modeIds.has(modeId)) &&
        allowedModeSets.has(event.modeIds.join(",")) &&
        isNonnegativeFinite(event.localTimeSeconds) &&
        event.localTimeSeconds < score.cycleSeconds &&
        isNonnegativeFinite(event.baseGain) &&
        isNonnegativeFinite(event.wetSend) &&
        event.wetSend <= 1 &&
        isNonnegativeFinite(event.stereoSpread) &&
        event.stereoSpread <= 1 &&
        Number.isInteger(event.partialCount) &&
        event.partialCount >= 1 &&
        event.partialCount <= 1 &&
        isNonnegativeFinite(event.amplitudeMotionDepth) &&
        event.amplitudeMotionDepth <= 1 &&
        isNonnegativeFinite(event.brightnessMotionDepth) &&
        event.brightnessMotionDepth <= 1 &&
        isNonnegativeFinite(event.panMotion) &&
        event.panMotion <= 1 &&
        event.registerMultiplier === 1 &&
        vowels.includes(event.vowelStart) &&
        vowels.includes(event.vowelEnd),
    ) &&
    preset &&
    Number.isInteger(preset.maximumPartials) &&
    preset.maximumPartials >= 1 &&
    preset.maximumPartials <= 1 &&
    isPositiveFinite(preset.partialDamping) &&
    isPositiveFinite(preset.maximumEventSeconds) &&
    isPositiveFinite(preset.breathSeconds) &&
    isPositiveFinite(preset.breathMinimumHz) &&
    isPositiveFinite(preset.breathMaximumHz) &&
    Number.isInteger(preset.breathComponentCount) &&
    preset.breathComponentCount > 0 &&
    isNonnegativeFinite(preset.stereoDetuneRatio) &&
    preset.stereoDetuneRatio < 1 &&
    isPositiveFinite(preset.antiAliasRatio) &&
    preset.antiAliasRatio <= 1 &&
    isPositiveFinite(preset.outputGain) &&
    isPositiveFinite(program.normalization) &&
    preset.articulations &&
    gestures.every((gesture) => {
      const articulation = preset.articulations[gesture];
      return (
        articulation &&
        isPositiveFinite(articulation.attackSeconds) &&
        isPositiveFinite(articulation.decaySeconds) &&
        isNonnegativeFinite(articulation.fadeStartSeconds) &&
        isPositiveFinite(articulation.endSeconds) &&
        articulation.fadeStartSeconds < articulation.endSeconds &&
        isNonnegativeFinite(articulation.breathGain) &&
        Array.isArray(articulation.moraOffsetsSeconds) &&
        Array.isArray(articulation.moraGains) &&
        articulation.moraOffsetsSeconds.length > 0 &&
        articulation.moraOffsetsSeconds.length === articulation.moraGains.length &&
        articulation.moraOffsetsSeconds[0] === 0 &&
        articulation.moraOffsetsSeconds.every(
          (offsetSeconds) =>
            isNonnegativeFinite(offsetSeconds) && offsetSeconds < articulation.endSeconds,
        ) &&
        articulation.moraGains.every((gain) => isPositiveFinite(gain) && gain <= 1)
      );
    }) &&
    preset.formants &&
    vowels.every(
      (vowel) =>
        Array.isArray(preset.formants[vowel]) &&
        preset.formants[vowel].length === 3 &&
        preset.formants[vowel].every(
          (band) =>
            isPositiveFinite(band.frequencyHz) &&
            isPositiveFinite(band.bandwidthHz) &&
            isNonnegativeFinite(band.amplitude),
        ),
    )
  );
}

export const mobiusChoirProcessor = {
  kind: "mobius-choir",
  validate: validateMobiusChoirProgram,
  stateError: "Unable to create Möbius Choir runtime",
  createState(program) {
    const runtime = createMobiusChoirRuntime(program);
    if (!runtime) return null;
    return {
      runtime,
      sample: { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 },
    };
  },
  resetState() {},
  render(program, state, absoluteTimeSeconds) {
    renderMobiusChoirSample(program, state.runtime, absoluteTimeSeconds, state.sample);
    return state.sample;
  },
};
