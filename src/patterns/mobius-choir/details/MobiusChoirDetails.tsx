import { useMemo } from "react";
import { renderToString } from "katex";

import type { MobiusChoirPatternDefinition } from "../types";
import { MobiusChoirPlots } from "./MobiusChoirAnalysis";

interface MobiusChoirDetailsProps {
  pattern: MobiusChoirPatternDefinition;
}

export function MobiusChoirDetails({ pattern }: MobiusChoirDetailsProps) {
  const renderedMath = useMemo(() => {
    const render = (latex: string) =>
      renderToString(latex, {
        throwOnError: false,
        displayMode: true,
      });
    return {
      formula: render(pattern.formulaLatex),
      eigenfunction: render(pattern.mathematics.eigenfunctionLatex),
      coefficient: render(pattern.mathematics.coefficientLatex),
      embedding: render(pattern.mathematics.embeddingLatex),
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
          dangerouslySetInnerHTML={{ __html: renderedMath.eigenfunction }}
        />
        <div
          className="mathIdentity"
          dangerouslySetInnerHTML={{ __html: renderedMath.coefficient }}
        />
        <p>{pattern.education.mathematicalBody}</p>
        <p>
          flat quotientは (x,0)∼(π−x,π) で同一視し、x=0,πをDirichlet境界とします。
          同一視辺で値が一致する必要十分条件はm+nは奇数です。
        </p>
        <div
          className="mathIdentity mathIdentity--compact"
          dangerouslySetInnerHTML={{ __html: renderedMath.embedding }}
        />
        <p className="scopeNotice">{pattern.education.scopeNotice}</p>
        <dl className="parameterList">
          <div>
            <dt>有限モード</dt>
            <dd>{pattern.definition.modes.length}モード / λ≤13</dd>
          </div>
          <div>
            <dt>数学時刻</dt>
            <dd>sₘ(t)=0.14t / 絶対transport時刻</dd>
          </div>
          <div>
            <dt>固定格子</dt>
            <dd>256×48 / 12,288頂点</dd>
          </div>
          <div>
            <dt>音楽構成</dt>
            <dd>
              {pattern.audio.score.cycleSeconds.toFixed(6)}秒・16小節・
              {pattern.audio.score.events.length}イベント・5幕（68 BPM）
            </dd>
          </div>
          <div>
            <dt>表示写像</dt>
            <dd>flat quotientを観察する非等長埋め込み</dd>
          </div>
          <div>
            <dt>変換アルゴリズム</dt>
            <dd>DFT・FFT・数値固有値解析を不使用</dd>
          </div>
        </dl>
      </section>

      <section className="dataSection spectralDetailsAnalysis">
        <div className="sectionLabel">
          <span>QUOTIENT MODE ANALYSIS</span>
          <span>固有値 λ（線形軸）</span>
        </div>
        <MobiusChoirPlots />
      </section>
    </>
  );
}
