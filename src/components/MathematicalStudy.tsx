import { useId, useMemo } from "react";
import type {
  MathematicalStudy as StudyDefinition,
  StudySample,
} from "../experience/mathematicalStudy";

function StudyDiagram({ sample, id }: { sample: StudySample; id: string }) {
  const [left, right, bottom, top] = sample.bounds;
  const frame = { x: 28, y: 24, width: 280, height: 188 };
  let scaleX = frame.width / (right - left);
  let scaleY = frame.height / (top - bottom);
  if (sample.equalAspect) scaleX = scaleY = Math.min(scaleX, scaleY);
  const originX = frame.x + (frame.width - (right - left) * scaleX) / 2;
  const originY = frame.y + (frame.height - (top - bottom) * scaleY) / 2;
  const x = (value: number) => originX + (value - left) * scaleX;
  const y = (value: number) => originY + (top - value) * scaleY;
  return (
    <svg
      className="studyDiagram"
      viewBox="0 0 336 248"
      aria-labelledby={`${id}-plot-title ${id}-caption`}
    >
      <title id={`${id}-plot-title`}>{sample.valueLabel}</title>
      <rect
        className="studyFrame"
        x={x(left)}
        y={y(top)}
        width={(right - left) * scaleX}
        height={(top - bottom) * scaleY}
      />
      {bottom < 0 && top > 0 && (
        <path className="studyAxis" d={`M${x(left)},${y(0)}H${x(right)}`} />
      )}
      {left < 0 && right > 0 && (
        <path className="studyAxis" d={`M${x(0)},${y(top)}V${y(bottom)}`} />
      )}
      {sample.curves.map((curve) => (
        <path
          key={curve.id}
          className={`studyCurve studyCurve--${curve.role}`}
          d={curve.points
            .map(([px, py], i) => `${i === 0 ? "M" : "L"}${x(px).toFixed(3)},${y(py).toFixed(3)}`)
            .join("")}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <text className="studyAxisLabel" x="308" y="236" textAnchor="end">
        {sample.xLabel}
      </text>
      <text className="studyAxisLabel" x="28" y="13">
        {sample.yLabel}
      </text>
    </svg>
  );
}

export function MathematicalStudy({
  definition,
  value,
  onChange,
}: {
  definition: StudyDefinition;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const sample = useMemo(() => definition.sample(value), [definition, value]);
  return (
    <section className="mathematicalStudy" aria-labelledby={`${id}-title`}>
      <span className="eyebrow">TRY A LITTLE CHANGE</span>
      <h3 id={`${id}-title`}>{definition.title}</h3>
      <p>{definition.prompt}</p>
      <StudyDiagram sample={sample} id={id} />
      <div className="studyControlLabel">
        <label htmlFor={`${id}-parameter`}>{definition.parameterLabel}</label>
        <output htmlFor={`${id}-parameter`}>{sample.valueLabel}</output>
      </div>
      <input
        id={`${id}-parameter`}
        type="range"
        min={definition.min}
        max={definition.max}
        step={definition.step}
        value={value}
        aria-valuetext={sample.valueLabel}
        aria-describedby={`${id}-finding`}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
      <p id={`${id}-finding`} className="studyFinding">
        {sample.finding}
      </p>
      <p id={`${id}-caption`} className="studyCaption">
        {sample.caption}
      </p>
      <div className="studyFootnote">
        <span>この図だけを変える、小さな実験。</span>
        <button type="button" onClick={() => onChange(definition.initial)}>
          初めの値
        </button>
      </div>
    </section>
  );
}
