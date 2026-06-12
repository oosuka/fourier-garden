import {
  RESIDUE_BLOOM_SERIES,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
} from "../math/fourier";
import type { PatternDefinition } from "./types";

export const patternRegistry: readonly PatternDefinition[] = [
  {
    id: "residue-bloom",
    order: 1,
    title: {
      en: "Residue Bloom",
      ja: "剰余の花",
    },
    subtitle: {
      en: "An observatory for harmonics congruent to one",
      ja: "4で割って1余る倍音の観測所",
    },
    formulaLatex:
      "f(x)=5\\sum_{k=0}^{12}\\frac{1}{k+1}\\sin((4k+1)x)",
    formula: RESIDUE_BLOOM_SERIES,
    terms: RESIDUE_BLOOM_SERIES.terms,
    mathematics: {
      operation: "finite-fourier-series-synthesis",
      coefficientSource: "analytic",
      phasorProjection: "imaginary",
      fftUsed: false,
      visualAngularRate: RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
      phasorLatex:
        "z(x)=\\sum_{k=0}^{12}A_k e^{i n_kx},\\quad f(x)=\\operatorname{Im}z(x)",
      complexCoefficientLatex:
        "c_{n_k}=-\\frac{iA_k}{2},\\quad c_{-n_k}=\\frac{iA_k}{2}",
    },
    audio: {
      mode: "sonification",
      fundamentalHz: 55,
      initialVolume: 0.35,
      roomSeconds: 1.9,
      sonificationLatex:
        "g_{\\nu_j}(\\tau)=CE(\\tau)\\sum_{n_k\\nu_j<0.45F_s}\\frac{A_k}{(k+1)^{1.4}}\\sin(2\\pi n_k\\nu_j\\tau)",
    },
    education: {
      gentleTitle: "見えない音の粒が、ひとつの花になる。",
      gentleBody:
        "大きさと速さの異なる13個の円がつながり、その先端の上下運動が右へ流れる波を正確に描きます。周囲の光と粒子は、その数学的な運動に同期した詩的な造形です。",
      mathematicalTitle: "Residue class 1 mod 4",
      mathematicalBody:
        "周波数指数を nₖ=4k+1 に制限した有限フーリエ級数です。複素フェーザの和 z(x) の虚部を f(x) として表示します。主波形と円の終点は同じ値を共有します。画面上では構造を観察できるよう x(t)=0.31t に減速しています。",
      scopeNotice:
        "本章は既知の解析係数から有限フーリエ級数を合成する作品です。未知の信号をDFTで解析する処理や、FFTアルゴリズムの計算過程は表示していません。",
      sonificationBody:
        "音声は級数そのものを55 Hzで無加工再生したものではありません。同じ調波指数を440 / 495 Hzへ移し、聴覚向けの高次減衰とナイキスト制約を適用した音楽的ソニフィケーションです。EQ、定位、残響はその後段の音響演出です。",
      poeticLayerBody:
        "粒子、光の膜、星雲、ブルーム、二次トレイルは数学層と同じ時間・焦点を共有しますが、フーリエ級数そのもののグラフではありません。",
    },
    async loadScene() {
      const module = await import("./residueBloomScene");
      return module.createResidueBloomScene;
    },
  },
];
