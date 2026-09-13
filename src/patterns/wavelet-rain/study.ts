import {
  studyLine,
  type MathematicalStudy,
  type StudyCurve,
} from "../../experience/mathematicalStudy";
import { integrateWaveletTarget } from "./math/model";

function projection(level: number, role: StudyCurve["role"]) {
  const count = 2 ** level;
  return Array.from({ length: count }, (_, i) => {
    const start = i / count;
    const end = (i + 1) / count;
    const value = integrateWaveletTarget(start, end) * count;
    return studyLine(`${role}-${i}`, role, [start, value], [end, value]);
  });
}
const reference = projection(6, "reference");

export const study: MathematicalStudy = {
  title: "細かく見ると、何が現れる？",
  prompt: "各区間の平均だけを残して、同じ信号を粗く見たり細かく見たりします。",
  parameterLabel: "観察の細かさ",
  min: 0,
  max: 6,
  step: 1,
  initial: 3,
  sample(level) {
    return {
      bounds: [0, 1, -2.3, 2.3],
      curves: [...reference, ...projection(level, "focus")],
      valueLabel: `J = ${level} · ${2 ** level} 区間`,
      caption:
        "実線は選んだ細かさのHaar射影、淡線は本編の64区間射影。各水平線は半開区間の一定値を示します。",
      finding:
        level === 0
          ? "全体を一つの区間にすると、信号の平均だけが残ります。"
          : "区間を半分にするたびに、左右の平均の差が新しい細部になります。どの細かさでも全体の積分は変わりません。",
      xLabel: "x · 0〜1",
      yLabel: "区間の平均",
    };
  },
};
