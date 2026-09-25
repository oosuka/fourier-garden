import { sampleStudyCurve, type MathematicalStudy } from "../../experience/mathematicalStudy";
import {
  evaluateMobiusChoirMode,
  getMobiusChoirCandidates,
  type MobiusChoirMode,
} from "./math/model";

const candidates = getMobiusChoirCandidates();
export const study: MathematicalStudy = {
  title: "ねじっても、波はつながる？",
  prompt: "帯を半ひねりして端を合わせます。左右の曲線が重なる候補だけが、この帯の波になれます。",
  parameterLabel: "波の候補",
  min: 0,
  max: candidates.length - 1,
  step: 1,
  initial: 1,
  sample(index) {
    const candidate = candidates[index]!;
    const mode: MobiusChoirMode = {
      ...candidate,
      id: index,
      coefficient: 1,
      voiceKind: candidate.n === 0 ? "single" : "quadrature-pair",
    };
    return {
      bounds: [0, Math.PI, -1.1, 1.1],
      curves: [
        sampleStudyCurve("seam-start", "reference", 0, Math.PI, 256, (x) => [
          x,
          evaluateMobiusChoirMode(mode, x, 0, 0),
        ]),
        sampleStudyCurve("seam-return", "focus", 0, Math.PI, 256, (x) => [
          x,
          evaluateMobiusChoirMode(mode, Math.PI - x, Math.PI, 0),
        ]),
      ],
      valueLabel: `m = ${mode.m}, n = ${mode.n} · ${candidate.allowed ? "つながる" : "つながらない"}`,
      caption:
        "淡線は sin(mx)、実線は反対端を折り返した sin(m(π−x)) cos(nπ)。時刻0、係数を1にした候補比較です。",
      finding: candidate.allowed
        ? "m + nが奇数なので、半ひねりの符号変化が打ち消し合います。二つの線は一致し、本編の許容条件を満たします。"
        : "m + nが偶数なので、つなぎ目で符号が逆になります。この候補は本編のモードから除外されます。",
      xLabel: "x · 0〜π",
      yLabel: "継ぎ目の変位",
    };
  },
};
