import { sampleStudyCurve, type MathematicalStudy } from "../../experience/mathematicalStudy";
import { evaluateRiemannPartial } from "./math/model";

const orders = [12, 24, 48, 96];
const reference = sampleStudyCurve("reference", "reference", -0.12, 0.12, 2048, (x) => [
  x,
  evaluateRiemannPartial(12, x),
]);

export const study: MathematicalStudy = {
  title: "小さな波は、どこまで残る？",
  prompt:
    "原点の近くを拡大します。二乗で速くなる回転と、二乗で小さくなる係数のせめぎ合いを見ます。",
  parameterLabel: "部分和の項数",
  min: 0,
  max: 3,
  step: 1,
  initial: 2,
  sample(index) {
    const order = orders[index]!;
    return {
      bounds: [-0.12, 0.12, -0.7, 0.7],
      curves: [
        reference,
        sampleStudyCurve("partial", "focus", -0.12, 0.12, 2048, (x) => [
          x,
          evaluateRiemannPartial(order, x),
        ]),
      ],
      valueLabel: `N = ${order} · 最高次数 ${order * order}`,
      caption:
        "Σ sin(n²x)/n² の有限部分和。淡線は12項。横軸 −0.12〜0.12、倍率を固定して比較します。",
      finding: `第${order}項の振幅は1/${order * order}。細部が増えても、ここに描いている${order}項の曲線は滑らかです。無限和の微分可能性とは区別します。`,
      xLabel: "x",
      yLabel: "Rₙ(x)",
    };
  },
};
