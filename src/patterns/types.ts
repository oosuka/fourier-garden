import type { AudioEngineProgram } from "../audio/audioProgram";
import type { MobiusChoirScoreProgram } from "../audio/mobiusChoirScore";
import type { MusicalScoreFrame, MusicalScoreProgram } from "./residue-bloom/audio/score";
import type { SpectralCathedralScoreProgram } from "./spectral-cathedral/audio/score";
import type { FourierSeriesDefinition, FourierTerm } from "../math/fourierSeries";
import type { MobiusChoirDefinition } from "../math/mobiusChoir";
import type { SpectralCathedralDefinition } from "./spectral-cathedral/math/model";

export interface LocalizedText {
  en: string;
  ja: string;
}

export interface PatternAnnotation {
  label: string;
  value: string;
}

export interface PatternPresentation {
  observatoryLabel: string;
  formulaEyebrow: string;
  formulaSummary: string;
  annotationContext: string;
  annotations: readonly PatternAnnotation[];
  poeticEyebrow: string;
  poeticLines: readonly string[];
  canvasAriaLabel: string;
}

export type PatternExpressiveAxis =
  | "density"
  | "dynamics"
  | "register"
  | "timbre"
  | "space"
  | "motion"
  | "color";

export interface PatternDramaturgySection {
  id: string;
  startRatio: number;
  endRatio: number;
  audioEnergy: number;
  visualEnergy: number;
  motionEnergy: number;
}

export interface PatternDramaturgy {
  cycleSeconds: number;
  sections: readonly PatternDramaturgySection[];
  expressiveAxes: readonly PatternExpressiveAxis[];
  localMathMapping: boolean;
  qualityContract: {
    comparableLoudness: true;
    decayingSonicContinuity: true;
    nonuniformVisualField: true;
    localVisualMotion: true;
    humanReviewRequired: true;
  };
}

export interface PatternAudioPreset {
  mode: "sonification";
  initialVolume: number;
  roomSeconds: number;
  sonificationLatex: string;
  createProgram(): AudioEngineProgram;
}

export interface ResidueBloomAudioPreset extends PatternAudioPreset {
  fundamentalHz: number;
  score: MusicalScoreProgram;
}

export interface SpectralCathedralAudioPreset extends PatternAudioPreset {
  baseFrequencyHz: number;
  score: SpectralCathedralScoreProgram;
}

export interface MobiusChoirAudioPreset extends PatternAudioPreset {
  baseFrequencyHz: number;
  score: MobiusChoirScoreProgram;
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

export interface EducationContent {
  gentleTitle: string;
  gentleBody: string;
  mathematicalTitle: string;
  mathematicalBody: string;
  scopeNotice: string;
  sonificationBody: string;
  poeticLayerBody: string;
}

export interface FrameContext {
  time: number;
  delta: number;
  playing: boolean;
}

export interface ResidueBloomFrameContext extends FrameContext {
  score: MusicalScoreFrame;
}

export interface Viewport {
  width: number;
  height: number;
  pixelRatio: number;
}

export type QualityLevel = "low" | "medium" | "high" | "ultra";

export interface PatternScene {
  update(frame: FrameContext): void;
  resize(viewport: Viewport): void;
  setQuality(level: QualityLevel): void;
  dispose(): void;
}

export interface ResidueBloomSceneInstance {
  update(frame: ResidueBloomFrameContext): void;
  resize(viewport: Viewport): void;
  setQuality(level: QualityLevel): void;
  dispose(): void;
}

export interface PatternSceneOptions {
  canvas: HTMLCanvasElement;
  seed: number;
  onDeviceLost?: () => void;
}

export type PatternSceneFactory = (options: PatternSceneOptions) => Promise<PatternScene>;

interface PatternDefinitionBase {
  id: string;
  order: number;
  publication: "published" | "preview";
  title: LocalizedText;
  subtitle: LocalizedText;
  formulaLatex: string;
  dramaturgy: PatternDramaturgy;
  presentation: PatternPresentation;
  education: EducationContent;
  loadScene(): Promise<PatternSceneFactory>;
}

export interface ResidueBloomPatternDefinition extends PatternDefinitionBase {
  kind: "residue-bloom";
  formula: FourierSeriesDefinition;
  terms: readonly FourierTerm[];
  mathematics: ResidueBloomMathematicalProvenance;
  audio: ResidueBloomAudioPreset;
}

export interface SpectralCathedralPatternDefinition extends PatternDefinitionBase {
  kind: "spectral-cathedral";
  definition: SpectralCathedralDefinition;
  mathematics: SpectralCathedralMathematicalProvenance;
  audio: SpectralCathedralAudioPreset;
}

export interface MobiusChoirPatternDefinition extends PatternDefinitionBase {
  kind: "mobius-choir";
  definition: MobiusChoirDefinition;
  mathematics: MobiusChoirMathematicalProvenance;
  audio: MobiusChoirAudioPreset;
}

export type PatternDefinition =
  | ResidueBloomPatternDefinition
  | SpectralCathedralPatternDefinition
  | MobiusChoirPatternDefinition;
