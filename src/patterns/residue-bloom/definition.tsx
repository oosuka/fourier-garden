import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
  evaluateMusicalScore,
} from "./audio/score";
import { createResidueBloomAudioProgram } from "./audio/synthesis";
import { ResidueBloomDetails } from "./details/ResidueBloomDetails";
import { RESIDUE_BLOOM_SERIES, RESIDUE_BLOOM_VISUAL_ANGULAR_RATE } from "./math/model";
import type { PatternScene } from "../contracts";
import type { ResidueBloomPatternDefinition } from "./types";
import { validateResidueBloomPattern } from "./validate";

const residueBloomScore = buildMusicalScoreProgram(
  RESIDUE_BLOOM_SCORE_DEFINITION,
  RESIDUE_BLOOM_SERIES,
  55,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
);

function ResidueBloomMathematicalDetails() {
  return <ResidueBloomDetails pattern={residueBloomPattern} />;
}

export const residueBloomPattern: ResidueBloomPatternDefinition = {
  kind: "residue-bloom",
  id: "residue-bloom",
  order: 1,
  publication: "published",
  title: {
    en: "Residue Bloom",
    ja: "剰余の花",
  },
  subtitle: {
    en: "An observatory for harmonics congruent to one",
    ja: "4で割って1余る倍音の観測所",
  },
  formulaLatex: "f(x)=5\\sum_{k=0}^{12}\\frac{1}{k+1}\\sin((4k+1)x)",
  contrastProfile: {
    composition: "phasor-chain-waveform",
    motion: "unidirectional-rotation-projection",
    space: "split-complex-plane-history",
    palette: "cyan-violet-gold",
    timbre: "rounded-harmonic-piko",
    rhythm: "ghosted-four-four-sixteenths",
    time: "absolute-phasor-long-form",
    audio: {
      onsetPattern: "constant-sixteenth-with-ghost-rotation",
      articulation: "rounded-harmonic-grain",
      pitchMapping: "residue-harmonics-on-alternating-carriers",
      spatialGesture: "phasor-position-pan",
      wetCharacter: "section-bloom-room",
    },
  },
  dramaturgy: {
    cycleSeconds: 144,
    expressiveAxes: ["density", "dynamics", "timbre", "space", "motion", "color"],
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
        id: "intro",
        startRatio: 0,
        endRatio: 8 / 48,
        audioEnergy: 0.32,
        visualEnergy: 0.38,
        motionEnergy: 0.34,
      },
      {
        id: "growth",
        startRatio: 8 / 48,
        endRatio: 20 / 48,
        audioEnergy: 0.68,
        visualEnergy: 0.72,
        motionEnergy: 0.7,
      },
      {
        id: "bloom",
        startRatio: 20 / 48,
        endRatio: 32 / 48,
        audioEnergy: 1,
        visualEnergy: 1,
        motionEnergy: 0.96,
      },
      {
        id: "hush",
        startRatio: 32 / 48,
        endRatio: 40 / 48,
        audioEnergy: 0.2,
        visualEnergy: 0.3,
        motionEnergy: 0.22,
      },
      {
        id: "return",
        startRatio: 40 / 48,
        endRatio: 1,
        audioEnergy: 0.62,
        visualEnergy: 0.66,
        motionEnergy: 0.6,
      },
    ],
  },
  presentation: {
    observatoryLabel: "RESIDUE BLOOM OBSERVATORY",
    formulaEyebrow: "FOURIER SERIES / フーリエ級数",
    formulaSummary:
      "Exact phasor synthesis and primary waveform · band-limited musical sonification.",
    annotationContext: "ANALYTIC SPECTRUM MAPPING / 解析的周波数対応",
    annotations: [
      { label: "n = 1", value: "55.00 Hz" },
      { label: "n = 5", value: "275.00 Hz" },
      { label: "n = 9", value: "495.00 Hz" },
      { label: "n = 13", value: "715.00 Hz" },
    ],
    poeticEyebrow: "VISIBLE HARMONICS / AUDIBLE GEOMETRY",
    poeticLines: ["円は音になり、", "音は光の庭になる。"],
    canvasAriaLabel: "フーリエ級数から生成されるエピサイクルと波形",
  },
  formula: RESIDUE_BLOOM_SERIES,
  terms: RESIDUE_BLOOM_SERIES.terms,
  mathematics: {
    operation: "finite-fourier-series-synthesis",
    coefficientSource: "analytic",
    phasorProjection: "imaginary",
    fftUsed: false,
    visualTime: {
      mode: "absolute-linear",
      angularRateRadiansPerSecond: RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
      wrapsWithScore: false,
    },
    spectrum: {
      kind: "analytic-one-sided-sine-amplitude",
      frequencyScale: "logarithmic",
      referenceFrequencyHz: 55,
    },
    rendering: {
      method: "sampled-polyline",
    },
    phasorLatex: "z(x)=\\sum_{k=0}^{12}A_k e^{i n_kx},\\quad f(x)=\\operatorname{Im}z(x)",
    complexCoefficientLatex: "c_{n_k}=-\\frac{iA_k}{2},\\quad c_{-n_k}=\\frac{iA_k}{2}",
  },
  audio: {
    mode: "sonification",
    fundamentalHz: 55,
    initialVolume: 0.35,
    roomSeconds: 0.82,
    sonificationLatex:
      "w_k=\\frac{A_k}{(k+1)^{3.2}},\\quad " +
      "f_{k,j}^{L/R}=n_k\\nu_j(1\\mp d),\\quad " +
      "g_{\\nu_j}^{L/R}(\\tau)=CG_eE_e(\\tau)" +
      "\\sum_{k\\in K(F_s)}w_kP_k^{L/R}" +
      "\\sin(2\\pi f_{k,j}^{L/R}\\tau)",
    score: residueBloomScore,
    createProgram: () => createResidueBloomAudioProgram(residueBloomScore),
  },
  education: {
    gentleTitle: "見えない音の粒が、ひとつの花になる。",
    gentleBody:
      "大きさと速さの異なる13個の円がつながり、その先端の上下運動が右へ流れる波を正確に描きます。音と周囲の光・粒子は、2分24秒の同じ楽譜を読み、発音ごとに呼吸します。",
    mathematicalTitle: "Residue class 1 mod 4",
    mathematicalBody:
      "周波数指数を nₖ=4k+1 に制限した有限フーリエ級数です。複素フェーザの和 z(x) の虚部を f(x) として表示し、主波形と円の終点は同じ値を共有します。厳密な幾何は x(t)=0.31t で独立に進み、48小節の発音イベントによって座標や半径を変形しません。",
    scopeNotice:
      "本章は既知の解析係数から有限フーリエ級数を合成する作品です。未知の信号をDFTで解析する処理や、FFTアルゴリズムの計算過程は表示していません。",
    sonificationBody:
      "音声は級数そのものを55 Hzで無加工再生したものではありません。音楽形式は48小節で反復しますが、定位・明るさ・アクセント・減衰は各周回の絶対イベント時刻における z(0.31tₑ) から評価します。フェーザ半径はアクセントと減衰へ使い、残響量は区間プロファイルから得ます。同じ調波指数を440 / 495 Hzへ移し、Aₖ/(k+1)^3.2の知覚重み、左右デチューン後のナイキスト制約、equal-power定位を適用します。強い上側調波と長い残響を抑えて全章共通の丸い中域ピコへ寄せますが、13調波の支持と係数由来順序は維持します。",
    poeticLayerBody:
      "粒子、光の膜、星雲、ブルーム、二次トレイルに加え、発音時の調波コロナと履歴パルスも共有イベントスコアへ反応する詩的な造形です。コロナとパルスは厳密な円・主波形と同じ点へ重なる別オブジェクトで、係数、位相、半径、終点、主波形の座標を変形しません。",
  },
  MathematicalDetails: ResidueBloomMathematicalDetails,
  validate() {
    validateResidueBloomPattern(this);
  },
  async loadScene() {
    const module = await import("./scene/scene");
    return async (options) => {
      const scene = await module.createResidueBloomScene(options);
      const adapter: PatternScene = {
        update(frame) {
          scene.update({
            ...frame,
            score: evaluateMusicalScore(residueBloomScore, frame.time),
          });
        },
        resize: (viewport) => scene.resize(viewport),
        setQuality: (level) => scene.setQuality(level),
        dispose: () => scene.dispose(),
      };
      return adapter;
    };
  },
};
