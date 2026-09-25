import { sampleStudyCurve, type MathematicalStudy } from "../../experience/mathematicalStudy";
import { evaluateSeries } from "../../math/fourierSeries";
import { RESIDUE_BLOOM_SERIES } from "./math/model";

const reference = sampleStudyCurve("all-terms", "reference", -Math.PI, Math.PI, 2048, (x) => [
  x,
  evaluateSeries(RESIDUE_BLOOM_SERIES, x),
]);

export const study: MathematicalStudy = {
  title: "ひとつずつ、波を重ねる",
  prompt: "項を増やすと、なめらかな波のどこに細部が生まれるでしょう。振幅の倍率は固定です。",
  parameterLabel: "重ねる項数",
  min: 1,
  max: 13,
  step: 1,
  initial: 3,
  sample(count) {
    const partial = { ...RESIDUE_BLOOM_SERIES, terms: RESIDUE_BLOOM_SERIES.terms.slice(0, count) };
    return {
      bounds: [-Math.PI, Math.PI, -16, 16],
      curves: [
        reference,
        sampleStudyCurve("partial", "focus", -Math.PI, Math.PI, 2048, (x) => [
          x,
          evaluateSeries(partial, x),
        ]),
      ],
      valueLabel: `${count} / 13 項`,
      caption: "淡線は全13項。実線は選んだ項までの部分和。横軸 −π〜π、縦軸は同一倍率。",
      finding:
        count === 13
          ? "49次までの13項が揃いました。淡線と実線が一致します。"
          : `最高調波は${4 * (count - 1) + 1}。追加する波も4で割ると1余り、振幅は5 / (k + 1)のままです。`,
      xLabel: "x",
      yLabel: "f(x)",
    };
  },
};
