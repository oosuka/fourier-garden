import type { FourierSeriesDefinition, FourierTerm } from "../../math/fourierSeries";
import type { AudioEngineProgram } from "../../audio/audioProgram";
import type {
  FrameContext,
  PatternAudioPreset,
  PatternDefinition,
  QualityLevel,
  Viewport,
} from "../contracts";
import type { MusicalScoreFrame, MusicalScoreProgram } from "./audio/score";
import type { ResidueBloomWorkletProgram } from "./audio/synthesis";

export interface ResidueBloomAudioPreset extends PatternAudioPreset {
  fundamentalHz: number;
  score: MusicalScoreProgram;
  createProgram(): AudioEngineProgram<ResidueBloomWorkletProgram>;
}

export interface ResidueBloomMathematicalProvenance {
  operation: "finite-fourier-series-synthesis";
  coefficientSource: "analytic";
  phasorProjection: "imaginary";
  fftUsed: false;
  visualTime: {
    mode: "absolute-linear";
    angularRateRadiansPerSecond: number;
    wrapsWithScore: false;
  };
  spectrum: {
    kind: "analytic-one-sided-sine-amplitude";
    frequencyScale: "logarithmic";
    referenceFrequencyHz: number;
  };
  rendering: {
    method: "sampled-polyline";
  };
  phasorLatex: string;
  complexCoefficientLatex: string;
}

export interface ResidueBloomFrameContext extends FrameContext {
  score: MusicalScoreFrame;
}

export interface ResidueBloomSceneInstance {
  update(frame: ResidueBloomFrameContext): void;
  resize(viewport: Viewport): void;
  setQuality(level: QualityLevel): void;
  dispose(): void;
}

export interface ResidueBloomPatternDefinition extends PatternDefinition {
  kind: "residue-bloom";
  formula: FourierSeriesDefinition;
  terms: readonly FourierTerm[];
  mathematics: ResidueBloomMathematicalProvenance;
  audio: ResidueBloomAudioPreset;
}
