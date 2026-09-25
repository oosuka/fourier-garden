import { createPatternQualityContract } from "../qualityContract";
import { observation } from "./observation";
import { study } from "./study";
import "./details/details.css";

import { MOBIUS_CHOIR_SCORE } from "./audio/score";
import { createMobiusChoirAudioProgram } from "./audio/synthesis";
import { MobiusChoirDetails } from "./details/MobiusChoirDetails";
import { MOBIUS_CHOIR_DEFINITION } from "./math/model";
import { MOBIUS_CHOIR_DRAMATURGY_SECTIONS } from "./scene/dramaturgy";
import type { PatternScene } from "../contracts";
import type { MobiusChoirPatternDefinition } from "./types";
import { validateMobiusChoirPattern } from "./validate";

function MobiusChoirMathematicalDetails() {
  return <MobiusChoirDetails pattern={mobiusChoirPattern} />;
}

export const mobiusChoirPattern: MobiusChoirPatternDefinition = {
  kind: "mobius-choir",
  id: "mobius-choir",
  order: 4,
  publication: "published",
  title: { en: "Möbius Choir", ja: "メビウスの合唱" },
  subtitle: {
    en: "One voice returns with its direction reversed",
    ja: "反転しながら一枚の面を巡る声",
  },
  formulaLatex:
    "u_M(x,y,t)=\\sum_{(m,n)\\in\\mathcal K_M}b_{mn}\\sin(mx)\\cos\\!\\left(ny-\\sqrt{\\lambda_{mn}}\\,0.14t\\right)",
  contrastProfile: {
    composition: "single-mobius-band-seam",
    motion: "traveling-wave-orientation-reversal",
    space: "floating-closed-ribbon",
    palette: "pearl-ivory-slate",
    timbre: "woven-vowel-modal-voice",
    rhythm: "four-four-continuous-grid",
    time: "two-turn-return",
    audio: {
      onsetPattern: "constant-sixteenth-flow-with-long-form-braid",
      articulation: "rounded-vowel-morph-finite-tail",
      pitchMapping: "nonlinear-normalized-mobius-eigenvalue",
      spatialGesture: "wide-seam-crossing-pan",
      wetCharacter: "long-wide-room-tail",
    },
  },
  dramaturgy: {
    cycleSeconds: MOBIUS_CHOIR_SCORE.cycleSeconds,
    sections: MOBIUS_CHOIR_DRAMATURGY_SECTIONS,
    expressiveAxes: ["dynamics", "timbre", "space", "motion", "color"],
    localMathMapping: true,
    qualityContract: createPatternQualityContract(),
  },
  presentation: {
    observatoryLabel: "MÖBIUS CHOIR OBSERVATORY",
    formulaEyebrow: "FLAT QUOTIENT TRAVELING WAVE / 平坦商空間の進行波",
    formulaSummary: "Six analytic modes · one twisted seam · finite woven voices.",
    annotationContext: "ALLOWED PARITY / 許容条件",
    annotations: [
      { label: "m+n ODD", value: "6 MODES" },
      { label: "λ ≤ 13", value: "ANALYTIC" },
      { label: "modal ω", value: "0.14√λₘₙ" },
      { label: "SEAM", value: "x ↦ π−x" },
    ],
    poeticEyebrow: "BREATH / TURN / CONFLUENCE",
    poeticLines: ["声は継ぎ目を越え、", "裏表を持たない一枚の面へ戻る。"],
    canvasAriaLabel: "中央に浮かぶメビウス帯を巡る進行波、符号領域、節線、声部リボン",
  },
  definition: MOBIUS_CHOIR_DEFINITION,
  mathematics: {
    operation: "finite-flat-mobius-dirichlet-traveling-wave-synthesis",
    coefficientSource: "analytic-normalized-eigenvalue-weight",
    fftUsed: false,
    numericalEigenanalysisUsed: false,
    mathematicalTime: { mode: "absolute-transport", wrapsWithScore: false, waveTimeScale: 0.14 },
    quotient: {
      identification: "(x,0)~(pi-x,pi)",
      boundary: "dirichlet-x-0-pi",
      allowedParity: "m+n-odd",
    },
    rendering: {
      sourceMetric: "flat-quotient",
      displayEmbedding: "non-isometric",
      method: "analytic-fixed-grid-samples",
      interpolation: "piecewise-linear",
    },
    eigenfunctionLatex:
      "\\phi_{mn}(x,y)=\\sin(mx)e^{iny},\\quad m+n\\equiv1\\pmod2,\\quad \\lambda_{mn}=m^2+n^2",
    coefficientLatex:
      "b_{mn}=\\frac{C_M}{1+\\lambda_{mn}},\\quad C_M=\\frac{105}{113},\\quad\\sum b_{mn}=1",
    embeddingLatex:
      "\\begin{aligned}F(x,y)&=\\begin{pmatrix}w\\cos y\\\\(R+w\\sin y)\\cos2y\\\\(R+w\\sin y)\\sin2y\\end{pmatrix}\\\\w&=x-\\frac\\pi2,\\quad R=2.4\\end{aligned}",
  },
  audio: {
    mode: "sonification",
    baseFrequencyHz: 420,
    initialVolume: 0.35,
    roomSeconds: 1.2,
    sonificationLatex:
      "f_{mn,r}^{L/R}=r\\left(420+500\\left(\\frac{\\sqrt{\\lambda_{mn}}-1}{\\sqrt{13}-1}\\right)^{1.65}\\right)(1\\mp d),\\quad \\psi_{mn,r,q}^{L/R}(t)=2\\pi f_{mn,r}^{L/R}t+r(0.14\\sqrt{\\lambda_{mn}}t+q\\pi/2)",
    score: MOBIUS_CHOIR_SCORE,
    createProgram: createMobiusChoirAudioProgram,
  },
  observation,
  study,
  education: {
    gentleTitle: "ひとつながりの帯を、柔らかな声が呼び交わす。",
    gentleBody:
      "帯の端をひねってつなぐと、声は継ぎ目を越えるたびに横向きを反転し、二周して元へ戻ります。規則的な発音に、丸い立ち上がりと重なる尾を持たせています。声の倍音がゆっくり変わると、帯上の光にも温度の差が現れます。",
    mathematicalTitle: "Flat Möbius quotient with Dirichlet boundary",
    mathematicalBody:
      "M₁=(0,π)×[0,π]/((x,0)∼(π−x,π))のflat quotientで、x=0,πにDirichlet条件を課します。m+nが奇数のλ≤13に限る6モードを解析的係数bₘₙで合成し、位相は絶対transport時刻に対する0.14√λₘₙtで進みます。",
    scopeNotice:
      "3次元の帯はflat quotientと節線を観察する非等長埋め込みです。埋め込み曲面の誘導計量に対するLaplace–Beltrami固有モードではなく、固定した表側・裏側も定義しません。DFT、FFT、数値固有値解析は使用しません。",
    sonificationBody:
      "音声は波動場の無加工再生ではありません。√λを420-920 Hzの基礎周波数へ圧縮し、bₘₙの基礎振幅比、許容条件、n>0の正弦・余弦対の位相関係を保持します。carrierを絶対transport時刻で連続評価し、モード変位と速度を振幅と定位へ写します。局所4 slot形へ16小節の長周期輪郭を重ね、強弱、尾長、wet、左右運動を非同期に変えます。2〜3部分音の母音を模した重み、330〜490 msの有限包絡、高域抑制EQ、圧縮、1.2秒の残響、-1 dBFSリミッターは音楽的変換です。",
    poeticLayerBody:
      "織り目の粒子、六本の声部リボン、継ぎ目の淡い残光は詩的造形です。局所発光は音と同じ係数利得・有限包絡・現在のモード変位を使い、部分音重みの比を色温度へ写します。進行するモードの光点は位相速度に従い、n=0の光点は固定します。厳密曲面、符号値、節線、境界の頂点は変形しません。",
  },
  MathematicalDetails: MobiusChoirMathematicalDetails,
  validate() {
    validateMobiusChoirPattern(this);
  },
  async loadScene() {
    const module = await import("./scene/scene");
    return async (options) => {
      const scene = await module.createMobiusChoirScene(options);
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
