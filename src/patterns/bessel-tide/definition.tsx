import { createFiveActSections } from "../analyticDefinition";
import { BESSEL_TIDE_SCORE } from "./audio/score";
import { createBesselTideAudioProgram } from "./audio/synthesis";
import { BesselTideDetails } from "./details/BesselTideDetails";
import type { BesselTidePatternDefinition } from "./types";
import { validateBesselTidePattern } from "./validate";
export const besselTidePattern: BesselTidePatternDefinition = {
  kind: "bessel-tide",
  id: "bessel-tide",
  order: 5,
  publication: "published",
  title: { en: "Bessel Tide", ja: "ベッセルの潮" },
  subtitle: {
    en: "Circular eigenmodes breathe between rings and rays",
    ja: "節円と節径を巡る円板の呼吸",
  },
  formulaLatex:
    "u_B(r,\\theta,t)=\\sum_{\\mathcal K_B}\\widetilde a_{m,n}^q\\cos(0.18j_{m,n}t/j_{0,1})\\phi_{m,n}^q(r,\\theta)",
  contrastProfile: {
    composition: "circular-bessel-basin",
    motion: "radial-angular-standing-tide",
    space: "central-disc-dark-rim",
    palette: "teal-cyan-indigo",
    timbre: "water-drop-resonant-piko",
    rhythm: "slow-six-eight-wave",
    time: "seventy-two-second-tide",
    audio: {
      onsetPattern: "six-eight-inward-outward-long-tide",
      articulation: "rounded-expanding-drop",
      pitchMapping: "normalized-bessel-zero",
      spatialGesture: "angular-mode-pan",
      wetCharacter: "soft-tidal-room",
    },
  },
  dramaturgy: {
    cycleSeconds: 72,
    sections: createFiveActSections(72, [
      { id: "shallows", endSeconds: 12, audioEnergy: 0.42, visualEnergy: 0.5, motionEnergy: 0.38 },
      { id: "incoming", endSeconds: 28, audioEnergy: 0.7, visualEnergy: 0.74, motionEnergy: 0.68 },
      { id: "spring-tide", endSeconds: 48, audioEnergy: 1, visualEnergy: 1, motionEnergy: 0.94 },
      { id: "undertow", endSeconds: 60, audioEnergy: 0.56, visualEnergy: 0.64, motionEnergy: 0.72 },
      {
        id: "slack-water",
        endSeconds: 72,
        audioEnergy: 0.28,
        visualEnergy: 0.38,
        motionEnergy: 0.3,
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
    observatoryLabel: "BESSEL TIDE OBSERVATORY",
    formulaEyebrow: "FOURIER–BESSEL EIGENMODES / 円板固有モード",
    formulaSummary: "Seventeen real disk modes · resonant midrange drop sonification.",
    annotationContext: "BESSEL ZEROS / ベッセル零点",
    annotations: [
      { label: "m≤4", value: "ANGULAR" },
      { label: "jₘₙ≤10", value: "RADIAL" },
      { label: "MODES", value: "17 REAL" },
      { label: "BOUNDARY", value: "DIRICHLET" },
    ],
    poeticEyebrow: "RINGS / RAYS / TIDE",
    poeticLines: ["円の縁に抱かれた波が、", "節を残して満ち引きする。"],
    canvasAriaLabel: "Fourier–Bessel固有モードから生成される円形水盤、節円、節径",
  },
  education: {
    gentleTitle: "丸い器には、丸い器だけの揺れ方がある。",
    gentleBody:
      "円板の縁を動かさないと、波は好きな形ではなく、決まった同心円と放射線を節として揺れます。17種類の揺れを重ねると、水盤の内側だけで山と谷が満ち引きし、零点の順序が水滴状のピコ音として内から外へ往復します。72秒の五幕で浅瀬から大潮、凪までを巡ります。",
    mathematicalTitle: "Dirichlet Fourier–Bessel basis",
    mathematicalBody:
      "単位円板上のDirichlet Laplacianを半径Bessel関数と角度三角関数へ分離します。jₘₙ≤10のDirichlet零点から17実モードを構成し、測度r dr dθに関する正規化と有限射影係数を用います。数学位相は絶対transport時刻で進みます。",
    scopeNotice:
      "Bessel零点は固定倍精度表で、画像から推定しません。使用するJₘの零点と、Neumann境界で現れる導関数J′ₘの零点を区別し、外側の膜を境界の変形とはみなしません。",
    sonificationBody:
      "零点順jₘₙを420–940 Hzへ単調写像し、射影係数の絶対値を強度、角度次数とcos/sin成分を定位へ使います。零点に比例する連続phase driftと小振幅の定位運動を持ち、72秒の潮汐輪郭で強弱、尾長、wetを別々に変えます。残響膨張と帯域制限は音楽的変換です。",
    poeticLayerBody:
      "外側膜、霧、粒子、波紋ハローは厳密円板を包む詩的造形です。節円・節径に対応する局所だけが発音へ反応し、r=1のDirichlet境界とモード頂点は動かしません。",
  },
  audio: {
    mode: "sonification",
    initialVolume: 0.35,
    roomSeconds: 1.05,
    sonificationLatex: "f_{m,n}=420+520\\frac{j_{m,n}-j_{0,1}}{j_{3,2}-j_{0,1}}",
    score: BESSEL_TIDE_SCORE,
    createProgram: createBesselTideAudioProgram,
  },
  MathematicalDetails: BesselTideDetails,
  validate() {
    validateBesselTidePattern(this);
  },
  async loadScene() {
    const module = await import("./scene/scene");
    return module.createBesselTideScene;
  },
};
