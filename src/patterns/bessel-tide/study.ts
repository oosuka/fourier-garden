import {
  sampleStudyCurve,
  studyLine,
  type MathematicalStudy,
} from "../../experience/mathematicalStudy";
import { BESSEL_MODES, BESSEL_ZEROS } from "./math/model";

const circle = (id: string, role: "focus" | "boundary", radius: number) =>
  sampleStudyCurve(id, role, 0, 2 * Math.PI, 256, (theta) => [
    radius * Math.cos(theta),
    radius * Math.sin(theta),
  ]);

export const study: MathematicalStudy = {
  title: "円の波には、どんな節がある？",
  prompt: "揺れない場所だけを取り出します。モードを選ぶと、同心円と直径の組み合わせが変わります。",
  parameterLabel: "円板の固有モード",
  min: 0,
  max: BESSEL_MODES.length - 1,
  step: 1,
  initial: 6,
  sample(index) {
    const mode = BESSEL_MODES[index]!;
    const innerRoots = BESSEL_ZEROS.filter((entry) => entry.m === mode.m && entry.n < mode.n);
    return {
      bounds: [-1, 1, -1, 1],
      equalAspect: true,
      curves: [
        circle("boundary", "boundary", 1),
        ...innerRoots.map((root) => circle(`radial-${root.n}`, "focus", root.zero / mode.zero)),
        ...Array.from({ length: mode.m }, (_, i) => {
          const angle = ((i + (mode.q === "cos" ? 0.5 : 0)) * Math.PI) / mode.m;
          return studyLine(
            `angular-${i}`,
            "focus",
            [-Math.cos(angle), -Math.sin(angle)],
            [Math.cos(angle), Math.sin(angle)],
          );
        }),
      ],
      valueLabel: `m = ${mode.m}, n = ${mode.n} · ${mode.q === "zero" ? "回転対称" : mode.q}`,
      caption:
        "半径1の円板。明線は選択した固有関数の節。外周の変位も0。曲線は解析的な零点から描きます。",
      finding: `内側の節円は${mode.n - 1}本、節の直径は${mode.m}本。音高の元になるBessel零点は${mode.zero.toFixed(4)}です。`,
      xLabel: "x",
      yLabel: "y",
    };
  },
};
