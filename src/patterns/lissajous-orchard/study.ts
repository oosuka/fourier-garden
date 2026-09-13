import { sampleStudyCurve, type MathematicalStudy } from "../../experience/mathematicalStudy";
import { evaluateLissajousAtPhase } from "./math/model";

const reference = sampleStudyCurve("reference", "reference", 0, 2 * Math.PI, 512, (s) =>
  evaluateLissajousAtPhase(2, 3, s, Math.PI / 2),
);

export const study: MathematicalStudy = {
  title: "速さを変えずに、形を変える",
  prompt: "横に2回、縦に3回。往復の回数を保ったまま、横の出発タイミングだけをずらしてみます。",
  parameterLabel: "横と縦の位相差",
  min: 0,
  max: 24,
  step: 1,
  initial: 12,
  sample(value) {
    const phase = (value * Math.PI) / 24;
    return {
      bounds: [-1, 1, -1, 1],
      equalAspect: true,
      curves: [
        reference,
        sampleStudyCurve("phase", "focus", 0, 2 * Math.PI, 512, (s) =>
          evaluateLissajousAtPhase(2, 3, s, phase),
        ),
      ],
      valueLabel: `δ = ${(value / 24).toFixed(3)}π`,
      caption: "(sin(2s + δ), sin(3s))、s = 0〜2π。淡線はδ = π/2。縦横の倍率は同じです。",
      finding:
        "形や交差の見え方が変わっても、整数比2:3は同じ。どの位相差でも2πで出発点へ戻ります。",
      xLabel: "sin(2s + δ)",
      yLabel: "sin(3s)",
    };
  },
};
