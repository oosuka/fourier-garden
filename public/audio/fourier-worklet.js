import { besselTideProcessor } from "./chapters/bessel-tide.js?v=30";
import { dirichletLanternsProcessor } from "./chapters/dirichlet-lanterns.js?v=30";
import { lissajousOrchardProcessor } from "./chapters/lissajous-orchard.js?v=30";
import { mobiusChoirProcessor } from "./chapters/mobius-choir.js?v=30";
import { phaseTorusProcessor } from "./chapters/phase-torus.js?v=30";
import { primeConstellationProcessor } from "./chapters/prime-constellation.js?v=30";
import { residueBloomProcessor } from "./chapters/residue-bloom.js?v=30";
import { riemannVeilProcessor } from "./chapters/riemann-veil.js?v=30";
import { isFiniteNumber } from "./chapters/shared.js?v=30";
import { spectralCathedralProcessor } from "./chapters/spectral-cathedral.js?v=30";
import { waveletRainProcessor } from "./chapters/wavelet-rain.js?v=30";

const PROCESSORS = new Map(
  [
    residueBloomProcessor,
    spectralCathedralProcessor,
    primeConstellationProcessor,
    mobiusChoirProcessor,
    besselTideProcessor,
    lissajousOrchardProcessor,
    dirichletLanternsProcessor,
    waveletRainProcessor,
    riemannVeilProcessor,
    phaseTorusProcessor,
  ].map((processor) => [processor.kind, processor]),
);
const SILENT_SAMPLE = { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 };

class FourierGardenProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.program = null;
    this.chapterProcessor = null;
    this.chapterState = null;
    this.active = false;
    this.sampleCursor = 0;
    this.fade = 0;
    this.hasReportedProgramError = false;
    this.startFrame = null;
    this.startPositionFrame = 0;
    this.observationRequest = null;

    this.port.onmessage = ({ data }) => {
      if (!data || typeof data !== "object") return;
      if (data.type === "configure") {
        this.configure(data.program);
      }
      if (data.type === "active") {
        this.active = data.value;
        this.startFrame = null;
      }
      if (
        data.type === "observe-position" &&
        Number.isSafeInteger(data.requestId) &&
        data.requestId >= 0
      ) {
        this.observationRequest = data.requestId;
      }
      if (
        data.type === "start" &&
        isFiniteNumber(data.seconds) &&
        data.seconds >= 0 &&
        isFiniteNumber(data.contextTime) &&
        data.contextTime >= 0
      ) {
        this.startFrame = Math.round(data.contextTime * sampleRate);
        this.startPositionFrame = Math.round(data.seconds * sampleRate);
        this.active = false;
        this.chapterProcessor?.resetState(this.chapterState);
      }
      if (data.type === "seek") {
        if (isFiniteNumber(data.seconds)) {
          this.startFrame = null;
          this.sampleCursor = Math.max(0, Math.round(data.seconds * sampleRate));
          this.chapterProcessor?.resetState(this.chapterState);
        }
      }
    };
  }

  configure(program) {
    this.program = null;
    this.chapterProcessor = null;
    this.chapterState = null;
    this.sampleCursor = 0;
    this.fade = 0;
    this.hasReportedProgramError = false;
    this.startFrame = null;
    this.startPositionFrame = 0;
    this.observationRequest = null;

    const processor =
      program && typeof program === "object" ? PROCESSORS.get(program.kind) : undefined;
    if (!processor || !processor.validate(program)) {
      this.reportProgramError("Invalid or unsupported audio worklet program");
      return;
    }

    const state = processor.createState(program);
    if (state === null) {
      this.reportProgramError(processor.stateError ?? "Unable to create chapter audio runtime");
      return;
    }

    this.program = program;
    this.chapterProcessor = processor;
    this.chapterState = state;
  }

  reportProgramError(message) {
    if (this.hasReportedProgramError) return;
    this.hasReportedProgramError = true;
    this.port.postMessage({ type: "error", message });
  }

  disableProgram(message) {
    this.chapterProcessor?.resetState(this.chapterState);
    this.program = null;
    this.chapterProcessor = null;
    this.chapterState = null;
    this.reportProgramError(message);
  }

  process(_inputs, outputs) {
    const dryOutput = outputs[0];
    const wetOutput = outputs[1];
    const dryLeft = dryOutput[0];
    const dryRight = dryOutput[1] ?? dryOutput[0];
    const wetLeft = wetOutput[0];
    const wetRight = wetOutput[1] ?? wetOutput[0];
    for (let frame = 0; frame < dryLeft.length; frame += 1) {
      if (this.startFrame !== null) {
        const contextFrame = currentFrame + frame;
        if (contextFrame < this.startFrame) {
          dryLeft[frame] = dryRight[frame] = wetLeft[frame] = wetRight[frame] = 0;
          continue;
        }
        // A delayed message catches up to the reserved epoch instead of moving the epoch.
        this.sampleCursor = this.startPositionFrame + contextFrame - this.startFrame;
        this.startFrame = null;
        this.active = true;
      }
      const target = this.active ? 1 : 0;
      this.fade += (target - this.fade) * 0.0018;
      if (!this.active && this.fade < 0.0001) {
        this.fade = 0;
        dryLeft[frame] = dryRight[frame] = wetLeft[frame] = wetRight[frame] = 0;
        continue;
      }
      const program = this.program;
      const processor = this.chapterProcessor;
      const state = this.chapterState;
      if (!program || !processor || !state) {
        dryLeft[frame] = 0;
        dryRight[frame] = 0;
        wetLeft[frame] = 0;
        wetRight[frame] = 0;
        continue;
      }

      const absoluteTimeSeconds = this.sampleCursor / sampleRate;
      let rendered = processor.render(program, state, absoluteTimeSeconds);

      if (
        !isFiniteNumber(rendered.dryLeft) ||
        !isFiniteNumber(rendered.dryRight) ||
        !isFiniteNumber(rendered.wetLeft) ||
        !isFiniteNumber(rendered.wetRight)
      ) {
        this.disableProgram("Audio worklet produced a non-finite sample");
        rendered = SILENT_SAMPLE;
      }

      dryLeft[frame] = rendered.dryLeft * this.fade;
      dryRight[frame] = rendered.dryRight * this.fade;
      wetLeft[frame] = rendered.wetLeft * this.fade;
      wetRight[frame] = rendered.wetRight * this.fade;

      if (this.active || this.fade > 0.0001) {
        this.sampleCursor += 1;
      }
    }

    // Opt-in diagnostics run once at the block boundary, never in the sample loop.
    if (this.observationRequest !== null) {
      this.port.postMessage({
        type: "position",
        requestId: this.observationRequest,
        contextFrame: currentFrame + dryLeft.length,
        positionFrame: this.sampleCursor,
        minimumPositionFrame: this.startPositionFrame,
        sampleRate,
        active: this.active && this.program !== null,
      });
      this.observationRequest = null;
    }
    return true;
  }
}

registerProcessor("fourier-garden-processor", FourierGardenProcessor);
