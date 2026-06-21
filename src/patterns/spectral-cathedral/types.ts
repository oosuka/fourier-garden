import type { AudioEngineProgram } from "../../audio/audioProgram";
import type { PatternAudioPreset, PatternDefinition } from "../contracts";
import type { SpectralCathedralScoreProgram } from "./audio/score";
import type { SpectralCathedralWorkletProgram } from "./audio/synthesis";
import type { SpectralCathedralDefinition } from "./math/model";

export interface SpectralCathedralAudioPreset extends PatternAudioPreset {
  baseFrequencyHz: number;
  score: SpectralCathedralScoreProgram;
  createProgram(): AudioEngineProgram<SpectralCathedralWorkletProgram>;
}

export interface SpectralCathedralMathematicalProvenance {
  operation: "finite-dirichlet-laplacian-eigenfunction-synthesis";
  coefficientSource: "analytic-finite-heat-kernel";
  fftUsed: false;
  mathematicalTime: {
    mode: "absolute-transport";
    wrapsWithScore: false;
  };
  analysis: {
    horizontalAxis: "linear-eigenvalue";
    signedValue: "coefficient";
    nonnegativeValue: "relative-energy-indicator";
  };
  rendering: {
    method: "analytic-fixed-grid-samples";
    interpolation: "piecewise-linear";
  };
  eigenproblemLatex: string;
  eigenfunctionLatex: string;
  coefficientLatex: string;
}

export interface SpectralCathedralPatternDefinition extends PatternDefinition {
  kind: "spectral-cathedral";
  definition: SpectralCathedralDefinition;
  mathematics: SpectralCathedralMathematicalProvenance;
  audio: SpectralCathedralAudioPreset;
}
