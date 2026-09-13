/** A chapter-owned, static comparison. Coordinates are mathematical values, not screen pixels. */
export type StudyPoint = readonly [number, number];

export interface StudyCurve {
  id: string;
  role: "focus" | "reference" | "boundary";
  points: readonly StudyPoint[];
}

export interface StudySample {
  bounds: readonly [left: number, right: number, bottom: number, top: number];
  equalAspect?: boolean;
  curves: readonly StudyCurve[];
  valueLabel: string;
  caption: string;
  finding: string;
  xLabel: string;
  yLabel: string;
}

export interface MathematicalStudy {
  title: string;
  prompt: string;
  parameterLabel: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  sample(value: number): StudySample;
}

export function sampleStudyCurve(
  id: string,
  role: StudyCurve["role"],
  start: number,
  end: number,
  segments: number,
  evaluate: (parameter: number) => StudyPoint,
): StudyCurve {
  return {
    id,
    role,
    points: Array.from({ length: segments + 1 }, (_, i) =>
      evaluate(start + ((end - start) * i) / segments),
    ),
  };
}

export function studyLine(
  id: string,
  role: StudyCurve["role"],
  from: StudyPoint,
  to: StudyPoint,
): StudyCurve {
  return { id, role, points: [from, to] };
}
