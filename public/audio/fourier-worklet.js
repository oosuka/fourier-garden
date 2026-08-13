import { besselTideProcessor } from "./chapters/bessel-tide.js?v=24";
import { dirichletLanternsProcessor } from "./chapters/dirichlet-lanterns.js?v=24";
import { lissajousOrchardProcessor } from "./chapters/lissajous-orchard.js?v=24";
import { mobiusChoirProcessor } from "./chapters/mobius-choir.js?v=24";
import { phaseTorusProcessor } from "./chapters/phase-torus.js?v=24";
import { primeConstellationProcessor } from "./chapters/prime-constellation.js?v=24";
import { residueBloomProcessor } from "./chapters/residue-bloom.js?v=24";
import { riemannVeilProcessor } from "./chapters/riemann-veil.js?v=24";
import { isFiniteNumber } from "./chapters/shared.js?v=24";
import { spectralCathedralProcessor } from "./chapters/spectral-cathedral.js?v=24";
import { waveletRainProcessor } from "./chapters/wavelet-rain.js?v=24";

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
    const target = this.active ? 1 : 0;

    for (let frame = 0; frame < dryLeft.length; frame += 1) {
      this.fade += (target - this.fade) * 0.0018;
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

    return true;
  }
}

registerProcessor("fourier-garden-processor", FourierGardenProcessor);
