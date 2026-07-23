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
    palette: "rose-magenta-gold",
    timbre: "stereo-answer-string-piko",
    rhythm: "nine-eight-farey-sequence",
    time: "closed-curves-slow-phase",
    audio: {
      onsetPattern: "nine-step-answer-with-sixty-second-arc",
      articulation: "paired-plucked-piko",
      pitchMapping: "farey-ratio-modulation",
      spatialGesture: "alternating-wide-stereo",
      wetCharacter: "short-orchard-halo",
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
    qualityContract: {
      comparableLoudness: true,
      decayingSonicContinuity: true,
      nonuniformVisualField: true,
      localVisualMotion: true,
      humanReviewRequired: true,
    },
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
  education: {
    gentleTitle: "二つの往復運動が、閉じた果実を描く。",
    gentleBody:
      "横と縦の往復回数を1:5、1:4、2:5のような既約整数比にすると、二つの運動は一周後に必ず同じ位相へ戻ります。九つの比はそれぞれ異なる果実の輪郭を描き、共有する位相差がゆっくり動くと交差の見え方だけが連続に変わります。左右二声部のピコ音はa:bの呼応を保ちます。",
    mathematicalTitle: "Rational linear flows on a torus",
    mathematicalBody:
      "第5次Farey列の内点である9個の既約比をflat torus上の有理線形流として扱い、座標ごとのsinによる平面射影を表示します。gcd(a,b)=1によりトーラス流はs=2πで帰還し、絶対transport時刻は共有位相差δₗ(t)だけを動かします。",
    scopeNotice:
      "曲線パラメータsとtransport時刻tを混同せず、無理比を閉曲線とは呼びません。平面上の自己交差は射影による一致であり、3次元の結び目や上下関係を意味しません。",
    sonificationBody:
      "比a:bを左右の発音分割、phase drift、連続定位へ保持し、整数和a+bだけを500–890 Hzの中域へ圧縮します。支持する九比はFarey順で循環し、その上へ60秒の強弱、尾長、wet輪郭を重ねます。交互定位、短い包絡、残響は聴取用の演出です。",
    poeticLayerBody:
      "枝影、花粉、花弁ハロー、奥行き方向の果樹配置は詩的造形です。厳密な選択曲線と同じ局所座標を起点にしますが、Farey比、周期、自己交差座標を変えません。",
  },
  audio: {
    mode: "sonification",
    initialVolume: 0.35,
    roomSeconds: 0.68,
    sonificationLatex: "a:b\\mapsto\\text{left/right subdivision ratio}",
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
