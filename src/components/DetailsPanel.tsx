import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { renderToString } from "katex";

import type { AudioEngine } from "../audio/AudioEngine";
import { getAnalyticSpectrum } from "../math/fourier";
import type { PatternDefinition } from "../patterns/types";
import { SpectrumAxis, SpectrumCanvas, WaveformCanvas } from "./DataCanvas";

interface DetailsPanelProps {
  open: boolean;
  pattern: PatternDefinition;
  audio: AudioEngine;
  onClose: () => void;
}

export function DetailsPanel({ open, pattern, audio, onClose }: DetailsPanelProps) {
  const [tab, setTab] = useState<"gentle" | "mathematical">("gentle");
  const renderedMath = useMemo(() => {
    const render = (latex: string) =>
      renderToString(latex, {
        throwOnError: false,
        displayMode: true,
      });

    return {
      formula: render(pattern.formulaLatex),
      phasor: render(pattern.mathematics.phasorLatex),
      complexCoefficients: render(pattern.mathematics.complexCoefficientLatex),
      sonification: render(pattern.audio.sonificationLatex),
    };
  }, [
    pattern.audio.sonificationLatex,
    pattern.formulaLatex,
    pattern.mathematics.complexCoefficientLatex,
    pattern.mathematics.phasorLatex,
  ]);
  const spectrum = getAnalyticSpectrum(
    pattern.formula,
    pattern.mathematics.spectrum.referenceFrequencyHz,
  );
  const score = pattern.audio.score;

  return (
    <aside
      className={`detailsPanel ${open ? "detailsPanel--open" : ""}`}
      aria-hidden={!open}
      inert={!open}
    >
      <header className="detailsHeader">
        <div>
          <span className="eyebrow">OBSERVATION NOTES</span>
          <h2>{pattern.title.ja}</h2>
        </div>
        <button className="iconButton" onClick={onClose} aria-label="詳細を閉じる">
          <X aria-hidden="true" />
        </button>
      </header>

      <div className="detailsTabs" role="tablist" aria-label="解説の種類">
        <button
          className={tab === "gentle" ? "isActive" : ""}
          onClick={() => setTab("gentle")}
          role="tab"
          aria-selected={tab === "gentle"}
        >
          やさしい説明
        </button>
        <button
          className={tab === "mathematical" ? "isActive" : ""}
          onClick={() => setTab("mathematical")}
          role="tab"
          aria-selected={tab === "mathematical"}
        >
          数学の詳細
        </button>
      </div>

      <div className="detailsScroll">
        {tab === "gentle" ? (
          <section className="gentleSection">
            <p className="poeticLead">{pattern.education.gentleTitle}</p>
            <p>{pattern.education.gentleBody}</p>
            <p>
              小さな円ほど速く回ります。すべての円の動きを足し合わせたものが、
              右へ流れる主波形です。音は同じ調波番号を使いながら、
              聞きやすい高さと明るさへ変換されています。
            </p>
            <div className="observationRule" />
            <p className="quietNote">{pattern.education.poeticLayerBody}</p>
            <p className="scopeNotice">{pattern.education.scopeNotice}</p>
          </section>
        ) : (
          <section className="mathSection">
            <span className="layerLabel">EXACT MATHEMATICAL LAYER / 厳密な数学層</span>
            <div
              className="detailsFormula"
              dangerouslySetInnerHTML={{ __html: renderedMath.formula }}
            />
            <div
              className="mathIdentity"
              dangerouslySetInnerHTML={{ __html: renderedMath.phasor }}
            />
            <p>{pattern.education.mathematicalBody}</p>
            <p>
              各発音の絶対イベント時刻 tₑ における z(0.31tₑ) を ΣAₖ
              で正規化します。pₓは定位、pᵧは合成後ローパスの明るさ、pᵣはアクセントと減衰へ写像します。
              残響送出は区間プロファイルから決まり、144秒の音楽形式が反復しても数学時刻はリセットしません。
            </p>
            <p className="scopeNotice">{pattern.education.scopeNotice}</p>
            <dl className="parameterList">
              <div>
                <dt>解析的スペクトルの周波数対応基準</dt>
                <dd>{pattern.mathematics.spectrum.referenceFrequencyHz.toFixed(2)} Hz</dd>
              </div>
              <div>
                <dt>表示用の数学時刻</dt>
                <dd>
                  x(t) = {pattern.mathematics.visualTime.angularRateRadiansPerSecond.toFixed(2)}t
                  rad（144秒で非リセット）
                </dd>
              </div>
              <div>
                <dt>音楽構成</dt>
                <dd>80 BPM / 4/4 / 48小節 / 2分24秒</dd>
              </div>
              <div>
                <dt>区間</dt>
                <dd>導入 → 成長 → 開花 → 静寂 → 再開</dd>
              </div>
              <div>
                <dt>同期</dt>
                <dd>AudioContext基準の共通イベントスコア</dd>
              </div>
              <div>
                <dt>発音中心</dt>
                <dd>
                  8f₀ / 9f₀ (
                  {(score.definition.carrierMultipliers[1] * pattern.audio.fundamentalHz).toFixed(
                    0,
                  )}{" "}
                  /{" "}
                  {(score.definition.carrierMultipliers[0] * pattern.audio.fundamentalHz).toFixed(
                    0,
                  )}{" "}
                  Hz)
                </dd>
              </div>
              <div>
                <dt>有限項数</dt>
                <dd>{pattern.terms.length}</dd>
              </div>
              <div>
                <dt>周波数指数</dt>
                <dd>n ≡ 1 (mod 4)</dd>
              </div>
              <div>
                <dt>表示スペクトル</dt>
                <dd>片側正弦振幅 Aₖ の解析値</dd>
              </div>
              <div>
                <dt>数学曲線の描画</dt>
                <dd>解析式の標本点を結ぶ数値描画</dd>
              </div>
              <div>
                <dt>変換アルゴリズム</dt>
                <dd>FFT不使用</dd>
              </div>
            </dl>
          </section>
        )}

        <section className="dataSection">
          <div className="sectionLabel">
            <span>SPECTRUM</span>
            <span>数学層・片側正弦振幅 Aₖ</span>
          </div>
          <SpectrumCanvas
            series={pattern.formula}
            referenceFrequencyHz={pattern.mathematics.spectrum.referenceFrequencyHz}
          />
          <SpectrumAxis
            series={pattern.formula}
            referenceFrequencyHz={pattern.mathematics.spectrum.referenceFrequencyHz}
          />
        </section>

        <section className="dataSection">
          <div className="sectionLabel">
            <span>AUDIO OUTPUT</span>
            <span>処理後の音響波形</span>
          </div>
          <WaveformCanvas audio={audio} />
        </section>

        <section className="dataSection sonificationSection">
          <div className="sectionLabel">
            <span>SONIFICATION</span>
            <span>音楽的変換</span>
          </div>
          <div
            className="mathIdentity mathIdentity--compact"
            dangerouslySetInnerHTML={{
              __html: renderedMath.sonification,
            }}
          />
          <p>{pattern.education.sonificationBody}</p>
        </section>

        <section className="coefficientSection">
          <div className="sectionLabel">
            <span>COEFFICIENTS</span>
            <span>正弦形式と複素係数</span>
          </div>
          <div
            className="mathIdentity mathIdentity--compact"
            dangerouslySetInnerHTML={{
              __html: renderedMath.complexCoefficients,
            }}
          />
          <table>
            <thead>
              <tr>
                <th>k</th>
                <th>n</th>
                <th>Hz</th>
                <th>Aₖ (sin)</th>
                <th>φₙ (sin)</th>
              </tr>
            </thead>
            <tbody>
              {spectrum.map((bin, index) => (
                <tr key={bin.harmonic}>
                  <td>
                    <i className={`coefficientDot coefficientDot--${index % 5}`} />
                    {index}
                  </td>
                  <td>{bin.harmonic}</td>
                  <td>{bin.frequencyHz.toFixed(0)}</td>
                  <td>{bin.amplitude.toFixed(3)}</td>
                  <td>{bin.sinePhase.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </aside>
  );
}
