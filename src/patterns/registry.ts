import { RESIDUE_BLOOM_SERIES } from "../math/fourier";
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
    audio: {
      fundamentalHz: 55,
      initialVolume: 0.35,
      roomSeconds: 1.9,
    },
    education: {
      gentleTitle: "見えない音の粒が、ひとつの花になる。",
      gentleBody:
        "大きさと速さの異なる13個の円がつながり、先端の動きがひとつの波を描きます。周囲の光と粒子も同じ数式に呼吸を合わせています。",
      mathematicalTitle: "Residue class 1 mod 4",
      mathematicalBody:
        "周波数指数を 4k+1 に制限した有限フーリエ級数です。表示スペクトルはFFTによる推定ではなく、既知の解析的係数から直接描画します。",
    },
    async loadScene() {
      const module = await import("./residueBloomScene");
      return module.createResidueBloomScene;
    },
  },
];
