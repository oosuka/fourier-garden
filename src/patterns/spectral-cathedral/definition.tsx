import "./details/details.css";

import { SPECTRAL_CATHEDRAL_SCORE } from "./audio/score";
import { createSpectralCathedralAudioProgram } from "./audio/synthesis";
import { SpectralCathedralDetails } from "./details/SpectralCathedralDetails";
import {
  SPECTRAL_CATHEDRAL_DEFINITION,
  SPECTRAL_CATHEDRAL_MATHEMATICAL_PROVENANCE,
} from "./math/model";
import type { PatternScene } from "../contracts";
import type { SpectralCathedralPatternDefinition } from "./types";
import { validateSpectralCathedralPattern } from "./validate";

function SpectralCathedralMathematicalDetails() {
  return <SpectralCathedralDetails pattern={spectralCathedralPattern} />;
}

export const spectralCathedralPattern: SpectralCathedralPatternDefinition = {
  kind: "spectral-cathedral",
  id: "spectral-cathedral",
  order: 2,
  publication: "published",
  title: {
    en: "Spectral Cathedral",
    ja: "スペクトルの聖堂",
  },
  subtitle: {
    en: "Standing waves inside an analytic boundary",
    ja: "解析的な境界に宿る定在波",
  },
  formulaLatex:
    "u_C(x,y,t)=\\sum_{(m,n)\\in\\mathcal K_C}a_{mn}\\cos(c_C\\sqrt{\\lambda_{mn}}t)\\phi_{mn}(x,y)",
  dramaturgy: {
    cycleSeconds: 75,
    expressiveAxes: ["density", "dynamics", "register", "timbre", "space", "motion", "color"],
    localMathMapping: true,
    qualityContract: {
      comparableLoudness: true,
      decayingSonicContinuity: true,
      nonuniformVisualField: true,
      localVisualMotion: true,
      humanReviewRequired: true,
    },
    sections: [
      {
        id: "illumination",
        startRatio: 0,
        endRatio: 3 / 18,
        audioEnergy: 0.24,
        visualEnergy: 0.28,
        motionEnergy: 0.2,
      },
      {
        id: "procession",
        startRatio: 3 / 18,
        endRatio: 7 / 18,
        audioEnergy: 0.46,
        visualEnergy: 0.5,
        motionEnergy: 0.46,
      },
      {
        id: "ascent",
        startRatio: 7 / 18,
        endRatio: 11 / 18,
        audioEnergy: 0.68,
        visualEnergy: 0.72,
        motionEnergy: 0.7,
      },
      {
        id: "resonance",
        startRatio: 11 / 18,
        endRatio: 15 / 18,
        audioEnergy: 1,
        visualEnergy: 1,
        motionEnergy: 0.94,
      },
      {
        id: "afterglow",
        startRatio: 15 / 18,
        endRatio: 1,
        audioEnergy: 0.3,
        visualEnergy: 0.38,
        motionEnergy: 0.24,
      },
    ],
  },
  presentation: {
    observatoryLabel: "SPECTRAL CATHEDRAL OBSERVATORY",
    formulaEyebrow: "DIRICHLET EIGENMODE SUM / 固有モード展開",
    formulaSummary:
      "Analytic standing-wave synthesis · five-act bell sonification of eigenvalue ratios.",
    annotationContext: "ANALYTIC EIGENVALUE MODES / 解析的固有モード",
    annotations: [
      { label: "λ = 3", value: "(1, 1)" },
      { label: "λ = 6", value: "(2, 1)" },
      { label: "λ = 9", value: "(1, 2)" },
      { label: "λ = 11", value: "(3, 1)" },
    ],
    poeticEyebrow: "BOUNDARY / STANDING WAVE / RESONANCE",
    poeticLines: ["境界は波を抱き、", "固有の響きは光の柱になる。"],
    canvasAriaLabel: "長方形領域の固有モードから生成される定在波面と節線",
  },
  definition: SPECTRAL_CATHEDRAL_DEFINITION,
  mathematics: {
    ...SPECTRAL_CATHEDRAL_MATHEMATICAL_PROVENANCE,
    eigenproblemLatex:
      "-\\Delta\\phi_{mn}=\\lambda_{mn}\\phi_{mn},\\quad\\phi_{mn}|_{\\partial\\Omega}=0",
    eigenfunctionLatex:
      "\\phi_{mn}(x,y)=\\frac{2}{\\sqrt{L_xL_y}}\\sin\\frac{m\\pi x}{L_x}\\sin\\frac{n\\pi y}{L_y},\\quad\\lambda_{mn}=m^2+2n^2",
    coefficientLatex: "a_{mn}=C_Ce^{-0.08\\lambda_{mn}}\\phi_{mn}(q_0),\\quad\\sum|a_{mn}|=1",
  },
  audio: {
    mode: "sonification",
    baseFrequencyHz: 176,
    initialVolume: 0.35,
    roomSeconds: 1.6,
    sonificationLatex:
      "f_{mn}=176\\sqrt{\\lambda_{mn}/3},\\quad " +
      "f_{mn,r}^{L/R}=rf_{mn}(1\\mp d),\\quad " +
      "w_{mn,r}=\\frac{|a_{mn}|}{\\max|a|}r^{-1.65},\\quad " +
      "d_{mn}=|\\cos(\\omega_{mn}t_e)|,\\ v_{mn}=|\\sin(\\omega_{mn}t_e)|",
    score: SPECTRAL_CATHEDRAL_SCORE,
    createProgram: createSpectralCathedralAudioProgram,
  },
  education: {
    gentleTitle: "ひとつの境界の中に、異なる揺れ方が重なっている。",
    gentleBody:
      "長方形の縁を動かさずに保つと、その内側には決まった形で揺れる12種類の波が生まれます。ここではそれらを解析式で重ね、75秒・18小節・5幕を通して、波面、節線、鐘の呼び交わしと共鳴として観察します。",
    mathematicalTitle: "Dirichlet Laplacian eigenmodes",
    mathematicalBody:
      "Ω=(0,π)×(0,π/√2)上のDirichletラプラシアン固有関数をλ≤30の12モードへ有限化し、解析的な熱核係数で合成します。各モードは初期速度0の余弦位相を持ち、数学時刻は絶対transport時刻で進みます。",
    scopeNotice:
      "固有値、固有関数、係数は解析式から直接得ています。表示軸は固有値λであり、Hzスペクトル、DFT、FFT、数値固有値解析ではありません。",
    sonificationBody:
      "音声は波動場の無加工再生ではありません。固有振動数比√(λ/3)、係数絶対値比、係数符号の開始位相を保持し、176 Hzを基準に移調したガラス鐘と木質アタックへ写します。75秒・18小節・5幕でtoll、answer、cascade、pulse、choirを展開し、絶対イベント時刻のモード変位を持続と残響、モード速度をアタックと明るさへ使います。左右デチューン後の帯域制限、EQ、圧縮、-1 dBFSリミッターを加えたソニフィケーションです。",
    poeticLayerBody:
      "7本の光柱、6本のアーチ、塵状粒子、透明ハロー、短い残光は詩的造形です。発音モードの固有関数値を柱ごとの局所励起へ写し、局所的な光柱とアーチ伝播、粒子帯、緩やかなカメラ軌道を作ります。固定格子面、境界、節線、固有値、係数は変形しません。",
  },
  MathematicalDetails: SpectralCathedralMathematicalDetails,
  validate() {
    validateSpectralCathedralPattern(this);
  },
  async loadScene() {
    const module = await import("./scene/scene");
    return async (options) => {
      const scene = await module.createSpectralCathedralScene(options);
      const adapter: PatternScene = {
        update: (frame) => scene.update(frame.time),
        resize: (viewport) => scene.resize(viewport),
        setQuality: (level) => scene.setQuality(level),
        dispose: () => scene.dispose(),
      };
      return adapter;
    };
  },
};
