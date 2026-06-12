import type {
  FourierSeriesDefinition,
  FourierTerm,
} from "../math/fourier";

export interface LocalizedText {
  en: string;
  ja: string;
}

export interface AudioPreset {
  fundamentalHz: number;
  initialVolume: number;
  roomSeconds: number;
}

export interface EducationContent {
  gentleTitle: string;
  gentleBody: string;
  mathematicalTitle: string;
  mathematicalBody: string;
}

export interface FrameContext {
  time: number;
  delta: number;
  playing: boolean;
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

export type PatternSceneFactory = (
  options: PatternSceneOptions,
) => Promise<PatternScene>;

export interface PatternDefinition {
  id: string;
  order: number;
  title: LocalizedText;
  subtitle: LocalizedText;
  formulaLatex: string;
  formula: FourierSeriesDefinition;
  terms: readonly FourierTerm[];
  audio: AudioPreset;
  education: EducationContent;
  loadScene(): Promise<PatternSceneFactory>;
}
