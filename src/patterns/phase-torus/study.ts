import type { MathematicalStudy, StudyCurve, StudyPoint } from "../../experience/mathematicalStudy";
import { getIrrationalTorusPhase } from "./math/model";

const ratios = [1, 3 / 2, 7 / 5, Math.SQRT2];
const labels = ["1", "3/2", "7/5", "√2"];

export const study: MathematicalStudy = {
  title: "近くへ戻ることと、閉じること",
  prompt: "二つの回転の速さの比を変えます。四角の向かい合う辺をつないだ空間がトーラスです。",
  parameterLabel: "回転速度の比",
  min: 0,
  max: 3,
  step: 1,
  initial: 3,
  sample(index) {
    const ratio = ratios[index]!;
    const origin = getIrrationalTorusPhase(0);
    const curves: StudyCurve[] = [];
    let points: StudyPoint[] = [];
    for (let i = 0; i <= 4096; i += 1) {
      const turns = (10 * i) / 4096;
      const point: StudyPoint = [
        (origin[0] / (2 * Math.PI) + turns) % 1,
        (origin[1] / (2 * Math.PI) + ratio * turns) % 1,
      ];
      const previous = points.at(-1);
      if (
        previous &&
        (Math.abs(previous[0] - point[0]) > 0.5 || Math.abs(previous[1] - point[1]) > 0.5)
      ) {
        curves.push({ id: `path-${curves.length}`, role: "focus", points });
        points = [];
      }
      points.push(point);
    }
    curves.push({ id: `path-${curves.length}`, role: "focus", points });
    return {
      bounds: [0, 1, 0, 1],
      equalAspect: true,
      curves,
      valueLabel: `1 : ${labels[index]}`,
      caption:
        "横の角度が10周する間の有限軌跡。両軸は角度を2πで割った値。辺を越えた区間は線で結びません。",
      finding:
        index === 3
          ? "√2は無理数なので、二つの回転が正の時刻に同時帰還することはありません。有限の図に見える接近は、厳密な帰還とは別です。"
          : `横が${[1, 2, 5][index]}周すると、縦も整数周になって同じ場所へ戻ります。閉じた道を、この図では繰り返したどっています。`,
      xLabel: "θ₁ / 2π",
      yLabel: "θ₂ / 2π",
    };
  },
};
