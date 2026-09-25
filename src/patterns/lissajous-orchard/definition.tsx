import { createPatternQualityContract } from "../qualityContract";
import { observation } from "./observation";
import { study } from "./study";
import { createFiveActSections } from "../analyticDefinition";
import { LISSAJOUS_ORCHARD_SCORE } from "./audio/score";
import { createLissajousOrchardAudioProgram } from "./audio/synthesis";
import { LissajousOrchardDetails } from "./details/LissajousOrchardDetails";
import type { LissajousOrchardPatternDefinition } from "./types";
import { validateLissajousOrchardPattern } from "./validate";
export const lissajousOrchardPattern: LissajousOrchardPatternDefinition = {
  kind: "lissajous-orchard",
  id: "lissajous-orchard",
  order: 6,
  publication: "published",
  title: { en: "Lissajous Orchard", ja: "リサージュの果樹園" },
  subtitle: {
    en: "Rational torus flows blossom as closed curves",
    ja: "有理トーラス流が結ぶ九つの閉曲線",
  },
  formulaLatex: "\\Gamma_{a,b}(s,t)=(\\sin(as+\\delta_L(t)),\\sin(bs))",
  contrastProfile: {
    composition: "hero-lissajous-eight-orchard-curves",
    motion: "shared-phase-curve-morph",
    space: "front-hero-receding-grid",
    palette: "green-gold",
    timbre: "curve-tracing-warm-string-piko",
    rhythm: "nine-thirty-two-point-farey-phrases",
    time: "closed-curves-slow-phase",
    audio: {
      onsetPattern: "thirty-two-point-curve-scan-with-sixty-second-arc",
      articulation: "curve-accented-plucked-piko",
      pitchMapping: "lissajous-coordinate-contour",
      spatialGesture: "curve-coordinate-pan",
      wetCharacter: "warm-orchard-halo",
    },
  },
  dramaturgy: {
    cycleSeconds: 60,
    sections: createFiveActSections(60, [
      { id: "planting", endSeconds: 15, audioEnergy: 0.45, visualEnergy: 0.5, motionEnergy: 0.4 },
      {
        id: "branching",
        endSeconds: 30,
        audioEnergy: 0.72,
        visualEnergy: 0.76,
        motionEnergy: 0.72,
      },
      {
        id: "cross-pollination",
        endSeconds: 45,
        audioEnergy: 1,
        visualEnergy: 1,
        motionEnergy: 0.94,
      },
      { id: "dusk", endSeconds: 52.5, audioEnergy: 0.3, visualEnergy: 0.4, motionEnergy: 0.32 },
      { id: "return", endSeconds: 60, audioEnergy: 0.66, visualEnergy: 0.7, motionEnergy: 0.62 },
    ]),
    expressiveAxes: ["density", "dynamics", "register", "timbre", "space", "motion", "color"],
    localMathMapping: true,
    qualityContract: createPatternQualityContract(),
  },
  presentation: {
    observatoryLabel: "LISSAJOUS ORCHARD OBSERVATORY",
    formulaEyebrow: "RATIONAL TORUS FLOW / 有理トーラス流",
    formulaSummary: "Nine Farey ratios · closed analytic curves · paired piko voices.",
    annotationContext: "FAREY ORDER / ファレイ順序",
    annotations: [
      { label: "RATIOS", value: "9 REDUCED" },
      { label: "gcd(a,b)", value: "1" },
      { label: "PERIOD", value: "2π" },
      { label: "PHASE", value: "SHARED" },
    ],
    poeticEyebrow: "RATIO / BRANCH / BLOOM",
    poeticLines: ["二つの周期が枝を伸ばし、", "閉じた果実の輪郭になる。"],
    canvasAriaLabel: "Farey比から生成される巨大なLissajous曲線と奥行きのある九曲線群",
  },
  observation,
  study,
  education: {
    gentleTitle: "二つの往復運動が、閉じた果実を描く。",
    gentleBody:
      "横と縦の往復回数を1:5、1:4、2:5のような既約整数比にすると、位相差を固定した曲線は一周後に同じ場所へ戻ります。九つの比が異なる果実の輪郭を描き、位相差をゆっくり変えると形そのものが移り変わります。曲線に沿った音の列と弦状の光が、同じ比をたどります。",
    mathematicalTitle: "Rational linear flows on a torus",
    mathematicalBody:
      "第5次Farey列の内点である9個の既約比をflat torus上の有理線形流として扱い、座標ごとのsinによる平面射影を表示します。gcd(a,b)=1によりトーラス流はs=2πで帰還し、絶対transport時刻は共有位相差δₗ(t)だけを動かします。",
    scopeNotice:
      "曲線パラメータsとtransport時刻tを混同せず、無理比を閉曲線とは呼びません。平面上の自己交差は射影による一致であり、3次元の結び目や上下関係を意味しません。",
    sonificationBody:
      "九比をFarey順の32音句へ写し、各曲線の標本座標から音高と強弱を作ります。音高の楽譜は基準時刻の標本を使い、定位は現在の位相δ(t)を連続評価します。光の発音点も同じδ(t)に従います。60秒の強弱、部分音の長い減衰、残響は弦のような広がりを作る音楽的変換です。",
    poeticLayerBody:
      "枝影、花粉、花弁ハロー、奥行き方向の果樹配置は詩的造形です。厳密な選択曲線と同じ局所座標を起点にしますが、Farey比、周期、自己交差座標を変えません。",
  },
  audio: {
    mode: "sonification",
    initialVolume: 0.35,
    roomSeconds: 0.68,
    sonificationLatex: "f=440+12r+90(x+1)+50(y+1)\\,\\mathrm{Hz}",
    score: LISSAJOUS_ORCHARD_SCORE,
    createProgram: createLissajousOrchardAudioProgram,
  },
  MathematicalDetails: LissajousOrchardDetails,
  validate() {
    validateLissajousOrchardPattern(this);
  },
  async loadScene() {
    const module = await import("./scene/scene");
    return module.createLissajousOrchardScene;
  },
};
