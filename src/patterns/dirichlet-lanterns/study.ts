import { sampleStudyCurve, type MathematicalStudy } from "../../experience/mathematicalStudy";
import { squareWavePartialSum, fejerSquareWave } from "./math/model";

export const study: MathematicalStudy = {
  title: "山は、項を増やせば消える？",
  prompt: "段差を有限の波で近似します。同じ最高次数の部分和とFejér平均を並べて見てください。",
  parameterLabel: "最高調波次数",
  min: 1,
  max: 63,
  step: 2,
  initial: 15,
  sample(order) {
    return {
      bounds: [-Math.PI, Math.PI, -1.3, 1.3],
      curves: [
        sampleStudyCurve("fejer", "reference", -Math.PI, Math.PI, 2048, (x) => [
          x,
          fejerSquareWave(order, x),
        ]),
        sampleStudyCurve("partial", "focus", -Math.PI, Math.PI, 2048, (x) => [
          x,
          squareWavePartialSum(order, x),
        ]),
      ],
      valueLabel: `N = ${order}`,
      caption: "実線は部分和、淡い破線はFejér平均。横軸 −π〜π、段差の左右の値は−1と1。",
      finding:
        "部分和の盛り上がりは段差の近くへ狭まります。Fejér平均は高次の係数を重み付けし、盛り上がりを抑えます。段差の位置では両方とも0です。",
      xLabel: "x",
      yLabel: "近似値",
    };
  },
};
