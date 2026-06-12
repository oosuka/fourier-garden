import type { MusicalScoreFrame, MusicalScoreProgram } from "../audio/musicalScore";
import type { FourierSeriesDefinition, FourierTerm } from "../math/fourier";

export interface LocalizedText {
  en: string;
  ja: string;
}

export interface AudioPreset {
  mode: "sonification";
  fundamentalHz: number;
  initialVolume: number;
  roomSeconds: number;
  sonificationLatex: string;
  score: MusicalScoreProgram;
}

export interface MathematicalProvenance {
  operation: "finite-fourier-series-synthesis";
  coefficientSource: "analytic";
  phasorProjection: "imaginary";
  fftUsed: false;
  visualAngularRate: number;
  phasorLatex: string;
  complexCoefficientLatex: string;
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

export interface PatternSceneOptions {
  canvas: HTMLCanvasElement;
  seed: number;
  onDeviceLost?: () => void;
}

export type PatternSceneFactory = (options: PatternSceneOptions) => Promise<PatternScene>;

export interface PatternDefinition {
  id: string;
  order: number;
  title: LocalizedText;
  subtitle: LocalizedText;
  formulaLatex: string;
  formula: FourierSeriesDefinition;
  terms: readonly FourierTerm[];
  mathematics: MathematicalProvenance;
  audio: AudioPreset;
  education: EducationContent;
  loadScene(): Promise<PatternSceneFactory>;
}
