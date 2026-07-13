import { useMemo } from "react";
import { renderToString } from "katex";

import type { SpectralCathedralPatternDefinition } from "../types";
import { SpectralCathedralPlots } from "./SpectralCathedralAnalysis";

interface SpectralCathedralDetailsProps {
  pattern: SpectralCathedralPatternDefinition;
}

export function SpectralCathedralDetails({ pattern }: SpectralCathedralDetailsProps) {
  const renderedMath = useMemo(() => {
    const render = (latex: string) =>
      renderToString(latex, {
        throwOnError: false,
        displayMode: true,
      });

    return {
      formula: render(pattern.formulaLatex),
      eigenproblem: render(pattern.mathematics.eigenproblemLatex),
      eigenfunction: render(pattern.mathematics.eigenfunctionLatex),
      coefficient: render(pattern.mathematics.coefficientLatex),
    };
  }, [pattern]);

  return (
    <>
      <section className="mathSection">
        <span className="layerLabel">EXACT MATHEMATICAL LAYER / 厳密な数学層</span>
        <div
          className="detailsFormula"
          dangerouslySetInnerHTML={{ __html: renderedMath.formula }}
        />
        <div
          className="mathIdentity"
          dangerouslySetInnerHTML={{ __html: renderedMath.eigenproblem }}
        />
        <div
          className="mathIdentity"
          dangerouslySetInnerHTML={{ __html: renderedMath.eigenfunction }}
        />
        <div
          className="mathIdentity"
          dangerouslySetInnerHTML={{ __html: renderedMath.coefficient }}
        />
        <p>{pattern.education.mathematicalBody}</p>
        <p className="scopeNotice">{pattern.education.scopeNotice}</p>
        <dl className="parameterList">
          <div>
            <dt>領域</dt>
            <dd>Ω=(0,π)×(0,π/√2)</dd>
          </div>
          <div>
            <dt>有限モード</dt>
            <dd>{pattern.definition.modes.length}モード / λ≤30</dd>
          </div>
          <div>
            <dt>数学時刻</dt>
            <dd>絶対transport時刻（反復で非リセット）</dd>
          </div>
          <div>
            <dt>固定格子</dt>
            <dd>192×128 / 24,576頂点</dd>
          </div>
          <div>
            <dt>音楽構成</dt>
            <dd>
              {pattern.audio.score.cycleSeconds.toFixed(0)}秒・18小節・
              {pattern.audio.score.events.length}イベント・5幕（72 BPM / 5/4）
            </dd>
          </div>
          <div>
            <dt>変換アルゴリズム</dt>
            <dd>DFT・FFT不使用</dd>
          </div>
        </dl>
      </section>

      <section className="dataSection spectralDetailsAnalysis">
        <div className="sectionLabel">
          <span>EIGENMODE ANALYSIS</span>
          <span>固有値 λ（線形軸）</span>
        </div>
        <SpectralCathedralPlots />
      </section>
    </>
  );
}
