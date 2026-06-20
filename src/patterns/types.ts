import type { AudioEngineProgram } from "../audio/audioProgram";
import type { MusicalScoreFrame, MusicalScoreProgram } from "../audio/musicalScore";
import type { SpectralCathedralScoreProgram } from "../audio/spectralCathedralScore";
import type { FourierSeriesDefinition, FourierTerm } from "../math/fourier";
import type { SpectralCathedralDefinition } from "../math/spectralCathedral";

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

export type PatternDefinition = ResidueBloomPatternDefinition | SpectralCathedralPatternDefinition;
