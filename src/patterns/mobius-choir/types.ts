import type { AudioEngineProgram } from "../../audio/audioProgram";
import type { PatternAudioPreset, PatternDefinition } from "../contracts";
import type { MobiusChoirScoreProgram } from "./audio/score";
import type { MobiusChoirWorkletProgram } from "./audio/synthesis";
import type { MobiusChoirDefinition } from "./math/model";

export interface MobiusChoirAudioPreset extends PatternAudioPreset {
  baseFrequencyHz: number;
  score: MobiusChoirScoreProgram;
  createProgram(): AudioEngineProgram<MobiusChoirWorkletProgram>;
}

export interface MobiusChoirMathematicalProvenance {
  operation: "finite-flat-mobius-dirichlet-traveling-wave-synthesis";
  coefficientSource: "analytic-normalized-eigenvalue-weight";
  fftUsed: false;
  numericalEigenanalysisUsed: false;
  mathematicalTime: {
    mode: "absolute-transport";
    wrapsWithScore: false;
    waveTimeScale: number;
  };
  quotient: {
    identification: "(x,0)~(pi-x,pi)";
    boundary: "dirichlet-x-0-pi";
    allowedParity: "m+n-odd";
  };
  rendering: {
    sourceMetric: "flat-quotient";
    displayEmbedding: "non-isometric";
    method: "analytic-fixed-grid-samples";
    interpolation: "piecewise-linear";
  };
  eigenfunctionLatex: string;
  coefficientLatex: string;
  embeddingLatex: string;
}

export interface MobiusChoirPatternDefinition extends PatternDefinition {
  kind: "mobius-choir";
  definition: MobiusChoirDefinition;
  mathematics: MobiusChoirMathematicalProvenance;
  audio: MobiusChoirAudioPreset;
}
