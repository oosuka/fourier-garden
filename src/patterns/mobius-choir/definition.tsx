import { MOBIUS_CHOIR_SCORE } from "./audio/score";
import { createMobiusChoirAudioProgram } from "./audio/synthesis";
import { MOBIUS_CHOIR_DEFINITION } from "./math/model";
import { MOBIUS_CHOIR_DRAMATURGY_SECTIONS } from "./scene/dramaturgy";
import type { MobiusChoirPatternDefinition, PatternScene } from "../types";

export const mobiusChoirPattern = {
  kind: "mobius-choir",
  id: "mobius-choir",
  order: 3,
  publication: "published",
  title: { en: "Möbius Choir", ja: "メビウスの合唱" },
  subtitle: {
    en: "One voice returns with its direction reversed",
    ja: "反転しながら一枚の面を巡る声",
  },
  formulaLatex:
    "u_M(x,y,t)=\\sum_{(m,n)\\in\\mathcal K_M}b_{mn}\\sin(mx)\\cos\\!\\left(ny-\\sqrt{\\lambda_{mn}}\\,0.14t\\right)",
  dramaturgy: {
    cycleSeconds: MOBIUS_CHOIR_SCORE.cycleSeconds,
    sections: MOBIUS_CHOIR_DRAMATURGY_SECTIONS,
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
    observatoryLabel: "MÖBIUS CHOIR OBSERVATORY",
    formulaEyebrow: "FLAT QUOTIENT TRAVELING WAVE / 平坦商空間の進行波",
    formulaSummary: "Six analytic modes · one twisted seam · five-act choral sonification.",
    annotationContext: "ALLOWED PARITY / 許容条件",
    annotations: [
      { label: "m+n ODD", value: "6 MODES" },
      { label: "λ ≤ 13", value: "ANALYTIC" },
      { label: "sₘ(t)", value: "0.14t" },
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
      "F(x,y)=\\bigl(w\\cos y,(R+w\\sin y)\\cos2y,(R+w\\sin y)\\sin2y\\bigr),\\ w=x-\\frac\\pi2,\\ R=2.4",
  },
  audio: {
    mode: "sonification",
    baseFrequencyHz: 196,
    initialVolume: 0.35,
    roomSeconds: 2.6,
    sonificationLatex:
      "f_{mn,r}^{L/R}=196r\\sqrt{\\lambda_{mn}}(1\\mp d),\\quad \\psi_{mn,r,q}^{L/R}(t)=2\\pi f_{mn,r}^{L/R}t+r(0.14\\sqrt{\\lambda_{mn}}t+q\\pi/2)",
    score: MOBIUS_CHOIR_SCORE,
    createProgram: createMobiusChoirAudioProgram,
  },
  education: {
    gentleTitle: "ひとつながりの帯を、短い声が呼び交わす。",
    gentleBody:
      "帯の端をひねってつなぐと、声は継ぎ目を越えるたびに横向きを反転し、二周して元へ戻ります。56.470588秒・63イベントの五つの幕で密度と音域を変え、呼吸、応答、反転、重なり、収束を聴き分けます。",
    mathematicalTitle: "Flat Möbius quotient with Dirichlet boundary",
    mathematicalBody:
      "M₁=(0,π)×[0,π]/((x,0)∼(π−x,π))のflat quotientで、x=0,πにDirichlet条件を課します。m+nが奇数のλ≤13に限る6モードを解析的係数bₘₙで合成し、数学時刻は絶対transport時刻0.14tで進みます。",
    scopeNotice:
      "3次元の帯はflat quotientと節線を観察する非等長埋め込みです。埋め込み曲面の誘導計量に対するLaplace–Beltrami固有モードではなく、固定した表側・裏側も定義しません。DFT、FFT、数値固有値解析は使用しません。",
    sonificationBody:
      "音声は波動場の無加工再生ではありません。√λの固有振動数比、bₘₙの基礎振幅比、許容条件、n>0の正弦・余弦対の位相関係を保持します。carrierを絶対transport時刻で連続評価し、モード変位と速度を振幅、部分音の明度、定位へ写します。63イベントには共通移調、母音フォルマント、短い呼吸包絡、EQ、圧縮、残響、-1 dBFSリミッターを加え、前周期の余韻も絶対イベント時刻で評価します。",
    poeticLayerBody:
      "息の粒子、六本の声部リボン、継ぎ目の淡いシアン残光は詩的造形です。音響と同じモード速度を粒子流へ渡し、局所変位・速度と継ぎ目通過から個別に応答します。厳密曲面、符号値、節線、境界の頂点は変形しません。",
  },
  async loadScene() {
    const module = await import("./scene/scene");
    return async (options) => {
      const scene = await module.createMobiusChoirScene(options);
      const adapter: PatternScene = {
        update: (frame) => scene.update(frame.time),
        resize: (viewport) => scene.resize(viewport),
        setQuality: (level) => scene.setQuality(level),
        dispose: () => scene.dispose(),
      };
      return adapter;
    };
  },
} satisfies MobiusChoirPatternDefinition;
