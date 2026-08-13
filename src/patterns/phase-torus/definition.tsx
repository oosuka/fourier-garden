import { createFiveActSections } from "../analyticDefinition";
import { PHASE_TORUS_SCORE } from "./audio/score";
import { createPhaseTorusAudioProgram } from "./audio/synthesis";
import { PhaseTorusDetails } from "./details/PhaseTorusDetails";
import type { PhaseTorusPatternDefinition } from "./types";
import { validatePhaseTorusPattern } from "./validate";
export const phaseTorusPattern: PhaseTorusPatternDefinition = {
  kind: "phase-torus",
  id: "phase-torus",
  order: 10,
  publication: "published",
  title: { en: "Phase Torus", ja: "位相トーラス" },
  subtitle: {
    en: "An irrational flow closes the garden without repeating",
    ja: "反復せず庭を巡る無理比の位相流",
  },
  formulaLatex:
    "F_T(\\theta_1,\\theta_2)=\\sum_{1\\le|m|+|n|\\le3}c_{m,n}e^{i(m\\theta_1+n\\theta_2)}",
  contrastProfile: {
    composition: "hero-three-dimensional-phase-torus",
    motion: "irrational-continuous-flow",
    space: "embedded-torus-and-flat-domain",
    palette: "indigo-cyan-gold",
    timbre: "round-phase-modulated-piko",
    rhythm: "nonuniform-twenty-step-mode-orbit",
    time: "nonclosing-absolute-flow",
    audio: {
      onsetPattern: "nonuniform-four-second-orbit-with-eighty-four-second-arc",
      articulation: "sustained-round-phase-pulse",
      pitchMapping: "combination-angular-speed",
      spatialGesture: "continuous-circular-pan",
      wetCharacter: "rotating-room-tail",
    },
  },
  dramaturgy: {
    cycleSeconds: 84,
    sections: createFiveActSections(84, [
      { id: "entry", endSeconds: 12, audioEnergy: 0.42, visualEnergy: 0.5, motionEnergy: 0.46 },
      { id: "winding", endSeconds: 30, audioEnergy: 0.68, visualEnergy: 0.74, motionEnergy: 0.7 },
      { id: "dense-passage", endSeconds: 54, audioEnergy: 1, visualEnergy: 1, motionEnergy: 0.96 },
      {
        id: "rational-mirror",
        endSeconds: 72,
        audioEnergy: 0.5,
        visualEnergy: 0.62,
        motionEnergy: 0.44,
      },
      {
        id: "open-orbit",
        endSeconds: 84,
        audioEnergy: 0.72,
        visualEnergy: 0.78,
        motionEnergy: 0.76,
      },
    ]),
    expressiveAxes: ["density", "dynamics", "register", "timbre", "space", "motion", "color"],
    localMathMapping: true,
    qualityContract: {
      comparableLoudness: true,
      decayingSonicContinuity: true,
      nonuniformVisualField: true,
      localVisualMotion: true,
      humanReviewRequired: true,
    },
  },
  presentation: {
    observatoryLabel: "PHASE TORUS OBSERVATORY",
    formulaEyebrow: "KRONECKER FLOW / Kronecker流",
    formulaSummary: "Twenty-four Fourier characters · irrational flow · rotating piko field.",
    annotationContext: "TWO PHASES / 二つの位相",
    annotations: [
      { label: "ω₂/ω₁", value: "√2" },
      { label: "MODES", value: "24" },
      { label: "HISTORY", value: "180 s" },
      { label: "METRIC", value: "FLAT T²" },
    ],
    poeticEyebrow: "WINDING / RETURN / OPEN ORBIT",
    poeticLines: ["二つの位相は同じ道へ戻らず、", "閉じた面を終わりなく巡る。"],
    canvasAriaLabel: "無理比Kronecker流の履歴を持つ巨大な位相トーラスとFourier場",
  },
  education: {
    gentleTitle: "閉じた面の上を、同じ場所へ戻らず歩き続ける。",
    gentleBody:
      "二つの角度を1:√2の速さで進めると、どれだけ巡っても二つが同時に出発点へ戻る周期はありません。道は閉じたトーラス上を隙間なく巡り、24個のFourier文字が場所ごとの明暗を作ります。途中で1:2の閉じる軌道を鏡のように重ね、戻る比と戻らない比を見比べます。",
    mathematicalTitle: "Kronecker flow and Fourier characters on T²",
    mathematicalBody:
      "flat T²上の無理比√2のKronecker流と24点の有限Fourier支持を、有理比1:2の閉軌道と比較します。係数は1≤|m|+|n|≤3に支持され、共役対称性により実数場を構成します。数学時刻は絶対transportで進みます。",
    scopeNotice:
      "稠密性は1と√2の有理独立性から得る定理で、有限履歴の見た目を証明とはしません。3D埋め込みの曲率をflat Fourier場へ混ぜず、係数をFFT推定値とも呼びません。",
    sonificationBody:
      "組合せ角速度|m+n√2|、係数絶対値、複素係数位相を、音高、強度、開始位相へ写します。絶対transport時刻の流を連続定位へ使い、その深さ、強弱、尾長、wetを84秒の別位相輪郭で動かします。7/8の420イベントが巡回しても数学軌道は閉じません。位相変調感と回転残響は帯域内の演出です。",
    poeticLayerBody:
      "位相霧、環状ハロー、外側粒子、3Dトーラスの有機シェルは詩的造形です。flat基本領域と同じ局所座標へ対応させますが、24係数、軌道履歴、共役対称性を変形しません。",
  },
  audio: {
    mode: "sonification",
    initialVolume: 0.35,
    roomSeconds: 1.08,
    sonificationLatex: "f_{m,n}=440+520\\,C(|m+n\\sqrt2|)",
    score: PHASE_TORUS_SCORE,
    createProgram: createPhaseTorusAudioProgram,
  },
  MathematicalDetails: PhaseTorusDetails,
  validate() {
    validatePhaseTorusPattern(this);
  },
  async loadScene() {
    const module = await import("./scene/scene");
    return module.createPhaseTorusScene;
  },
};
