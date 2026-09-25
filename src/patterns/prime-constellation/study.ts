import { sampleStudyCurve, type MathematicalStudy } from "../../experience/mathematicalStudy";
import { PRIME_SUPPORT } from "./math/model";

export const study: MathematicalStudy = {
  title: "素数を、ひとつずつ加える",
  prompt:
    "異なる速さで回る点を足すと、合計の軌跡はどう変わるでしょう。各点の重みは1/25に保ちます。",
  parameterLabel: "使う素数の数",
  min: 1,
  max: 25,
  step: 1,
  initial: 5,
  sample(count) {
    const support = PRIME_SUPPORT.slice(0, count);
    return {
      bounds: [-1, 1, -1, 1],
      equalAspect: true,
      curves: [
        sampleStudyCurve("sum", "focus", 0, 2 * Math.PI, 4096, (x) => [
          support.reduce((sum, p) => sum + Math.cos(p * x), 0) / 25,
          support.reduce((sum, p) => sum + Math.sin(p * x), 0) / 25,
        ]),
      ],
      valueLabel: `${count} 個 · 最大 ${support.at(-1)}`,
      caption:
        "(1/25) Σ exp(ipx) の複素平面上の軌跡。x = 0〜2π。星の3D配置とは別の、和そのものの図です。",
      finding: `x = 0では全点が揃い、和の実部は${(count / 25).toFixed(2)}。途中で内側へ折り込まれるのは、回転の位相が互いを打ち消すためです。`,
      xLabel: "Re z",
      yLabel: "Im z",
    };
  },
};
