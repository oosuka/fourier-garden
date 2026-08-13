import type { ComponentType } from "react";

import type { AudioEngineProgram } from "../audio/audioProgram";

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

export interface PatternContrastProfile {
  composition: string;
  motion: string;
  space: string;
  palette: string;
  timbre: string;
  rhythm: string;
  time: string;
  audio: {
    onsetPattern: string;
    articulation: string;
    pitchMapping: string;
    spatialGesture: string;
    wetCharacter: string;
  };
}

export interface PatternScoreContract {
  cycleSeconds: number;
}

export interface PatternAudioPreset {
  mode: "sonification";
  initialVolume: number;
  roomSeconds: number;
  sonificationLatex: string;
  score: PatternScoreContract;
  createProgram(): AudioEngineProgram;
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
  kind: string;
  order: number;
  publication: "published" | "preview";
  title: LocalizedText;
  subtitle: LocalizedText;
  formulaLatex: string;
  contrastProfile: PatternContrastProfile;
  dramaturgy: PatternDramaturgy;
  presentation: PatternPresentation;
  education: EducationContent;
  audio: PatternAudioPreset;
  MathematicalDetails: ComponentType;
  validate(): void;
  loadScene(): Promise<PatternSceneFactory>;
}
