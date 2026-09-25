import { createPatternQualityContract } from "../qualityContract";
import { observation } from "./observation";
import { study } from "./study";
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
  contrastProfile: {
    composition: "rectangular-wave-surface-columns",
    motion: "standing-wave-vertical-propagation",
    space: "deep-cathedral-vault",
    palette: "quartz-green-amber",
    timbre: "quartz-contact-modal-body",
    rhythm: "five-four-constant-grid",
    time: "standing-breath-seventy-five",
    audio: {
      onsetPattern: "constant-five-four-sixteenths-with-long-form-rotation",
      articulation: "decaying-second-partial-finite-body",
      pitchMapping: "normalized-square-root-eigenvalue",
      spatialGesture: "central-faceted-pan",
      wetCharacter: "short-low-wet-room",
    },
  },
  dramaturgy: {
    cycleSeconds: 75,
    expressiveAxes: ["density", "dynamics", "register", "timbre", "space", "motion", "color"],
    localMathMapping: true,
    qualityContract: createPatternQualityContract(),
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
      "Analytic standing waves · quartz-like pulses from eigenmodes and absolute phase.",
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
    baseFrequencyHz: 420,
    initialVolume: 0.35,
    roomSeconds: 0.55,
    sonificationLatex:
      "f_{mn}=420+560\\frac{\\sqrt{\\lambda_{mn}}-\\sqrt{3}}{\\sqrt{27}-\\sqrt{3}},\\quad " +
      "f_{mn}^{L/R}=f_{mn}(1\\mp d),\\quad " +
      "w_{mn}=\\left(\\frac{|a_{mn}|}{\\max|a|}\\right)^{0.6},\\quad " +
      "d_{mn}=|\\cos(\\omega_{mn}t_e)|,\\ v_{mn}=|\\sin(\\omega_{mn}t_e)|",
    score: SPECTRAL_CATHEDRAL_SCORE,
    createProgram: createSpectralCathedralAudioProgram,
  },
  observation,
  study,
  education: {
    gentleTitle: "ひとつの境界の中に、異なる揺れ方が重なっている。",
    gentleBody:
      "長方形の縁を動かさずに保つと、その内側には決まった形で揺れる12種類の波が生まれます。ここではそれらを解析式で重ね、75秒・18小節・360イベントの一定パルスとして、波面、節線、固有値の呼び交わしを観察します。",
    mathematicalTitle: "Dirichlet Laplacian eigenmodes",
    mathematicalBody:
      "Ω=(0,π)×(0,π/√2)上のDirichletラプラシアン固有関数をλ≤30の12モードへ有限化し、解析的な熱核係数で合成します。各モードは初期速度0の余弦位相を持ち、数学時刻は絶対transport時刻で進みます。",
    scopeNotice:
      "固有値、固有関数、係数は解析式から直接得ています。表示軸は固有値λであり、Hzスペクトル、DFT、FFT、数値固有値解析ではありません。",
    sonificationBody:
      "√λを420-980 Hzの基音へ写し、係数の符号を開始位相へ、最大値で正規化した絶対値の0.6乗を聴覚上の強さへ写します。弱い第2部分音が先に消え、丸い基音の響きが残ります。その減衰と柱の局所発光は、発音時のモード変位・速度から生まれます。75秒の一定格子の中で尾長と強弱が変化し、左右デチューン後の帯域制限、EQ、短い残響、-1 dBFSリミッターを通します。数学係数そのものの再生ではありません。",
    poeticLayerBody:
      "7本の細い光柱、6本のアーチ、塵状粒子と残光は詩的造形です。波面上の観測位置に柱を置き、発音モードの固有関数値と音と同じ有限包絡・発音強度・係数の知覚利得から局所的に励起します。長いアーチの余韻は別の演出です。動きを抑える設定では柱と粒子の位置を固定し、数学の波面・節線と局所的な明滅は続けます。",
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
        update: (frame) => scene.update(frame.time, frame.reducedMotion),
        resize: (viewport) => scene.resize(viewport),
        setQuality: (level) => scene.setQuality(level),
        dispose: () => scene.dispose(),
      };
      return adapter;
    };
  },
};
