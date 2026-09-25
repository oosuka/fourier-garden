import { studyLine, type MathematicalStudy } from "../../experience/mathematicalStudy";
import { SPECTRAL_CATHEDRAL_DEFINITION as model } from "./math/model";

export const study: MathematicalStudy = {
  title: "動かない線を探す",
  prompt: "一つの固有モードを取り出します。番号を変えても、長方形の境界は動きません。",
  parameterLabel: "固有モード",
  min: 0,
  max: model.modes.length - 1,
  step: 1,
  initial: 4,
  sample(index) {
    const mode = model.modes[index]!;
    const { width, height } = model;
    const curves = [
      studyLine("bottom", "boundary", [0, 0], [width, 0]),
      studyLine("top", "boundary", [0, height], [width, height]),
      studyLine("left", "boundary", [0, 0], [0, height]),
      studyLine("right", "boundary", [width, 0], [width, height]),
      ...Array.from({ length: mode.m - 1 }, (_, i) =>
        studyLine(
          `vertical-${i}`,
          "focus",
          [((i + 1) * width) / mode.m, 0],
          [((i + 1) * width) / mode.m, height],
        ),
      ),
      ...Array.from({ length: mode.n - 1 }, (_, i) =>
        studyLine(
          `horizontal-${i}`,
          "focus",
          [0, ((i + 1) * height) / mode.n],
          [width, ((i + 1) * height) / mode.n],
        ),
      ),
    ];
    return {
      bounds: [0, width, 0, height],
      equalAspect: true,
      curves,
      valueLabel: `m = ${mode.m}, n = ${mode.n}`,
      caption:
        "固有関数が0になる節線。外周も常に0。面の高さや係数の大きさは、この図には含めません。",
      finding: `節が${mode.m * mode.n}個の領域を分けます。固有値 λ = m² + 2n² = ${mode.eigenvalue}。モードを変えると音高の元になる√λも変わります。`,
      xLabel: "x · 0〜π",
      yLabel: "y · 0〜π/√2",
    };
  },
};
