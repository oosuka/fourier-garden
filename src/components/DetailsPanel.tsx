import { X } from "lucide-react";
import { useMemo, useState } from "react";
import katex from "katex";

import type { AudioEngine } from "../audio/AudioEngine";
import { createRhythmPreset } from "../audio/synthesis";
import { getAnalyticSpectrum } from "../math/fourier";
import type { PatternDefinition } from "../patterns/types";
import { SpectrumCanvas, WaveformCanvas } from "./DataCanvas";

interface DetailsPanelProps {
  open: boolean;
  pattern: PatternDefinition;
  audio: AudioEngine;
  playing: boolean;
  onClose: () => void;
}

export function DetailsPanel({
  open,
  pattern,
  audio,
  playing,
  onClose,
}: DetailsPanelProps) {
  const [tab, setTab] = useState<"gentle" | "mathematical">("gentle");
  const renderedMath = useMemo(
    () => {
      const render = (latex: string) =>
        katex.renderToString(latex, {
          throwOnError: false,
          displayMode: true,
        });

      return {
        formula: render(pattern.formulaLatex),
        phasor: render(pattern.mathematics.phasorLatex),
        complexCoefficients: render(
          pattern.mathematics.complexCoefficientLatex,
        ),
        sonification: render(pattern.audio.sonificationLatex),
      };
    },
    [
      pattern.audio.sonificationLatex,
      pattern.formulaLatex,
      pattern.mathematics.complexCoefficientLatex,
      pattern.mathematics.phasorLatex,
    ],
  );
  const spectrum = getAnalyticSpectrum(
    pattern.formula,
    pattern.audio.fundamentalHz,
  );
  const rhythm = createRhythmPreset(pattern.audio.fundamentalHz);

  return (
    <aside className={`detailsPanel ${open ? "detailsPanel--open" : ""}`}>
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
            <span className="layerLabel">
              EXACT MATHEMATICAL LAYER / 厳密な数学層
            </span>
            <div
              className="detailsFormula"
              dangerouslySetInnerHTML={{ __html: renderedMath.formula }}
            />
            <div
              className="mathIdentity"
              dangerouslySetInnerHTML={{ __html: renderedMath.phasor }}
            />
            <p>{pattern.education.mathematicalBody}</p>
            <p className="scopeNotice">{pattern.education.scopeNotice}</p>
            <dl className="parameterList">
              <div>
                <dt>数学上の基準周波数</dt>
                <dd>{pattern.audio.fundamentalHz.toFixed(2)} Hz</dd>
              </div>
              <div>
                <dt>表示用の角速度</dt>
                <dd>
                  x(t) ={" "}
                  {pattern.mathematics.visualAngularRate.toFixed(2)}t
                  rad
                </dd>
              </div>
              <div>
                <dt>音響パルス</dt>
                <dd>{rhythm.bpm} BPM / 16分音符</dd>
              </div>
              <div>
                <dt>発音中心</dt>
                <dd>
                  8f₀ / 9f₀ (
                  {rhythm.frequenciesHz[1]?.toFixed(0)} /{" "}
                  {rhythm.frequenciesHz[0]?.toFixed(0)} Hz)
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
                <dd>解析的係数</dd>
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
            <span>数学層・解析的係数</span>
          </div>
          <SpectrumCanvas />
          <div className="frequencyAxis">
            <span>55</span>
            <span>440</span>
            <span>1k</span>
            <span>2.7k Hz</span>
          </div>
        </section>

        <section className="dataSection">
          <div className="sectionLabel">
            <span>AUDIO OUTPUT</span>
            <span>処理後の音響波形</span>
          </div>
          <WaveformCanvas audio={audio} playing={playing} />
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
                <th>Aₙ</th>
                <th>φₙ (sin)</th>
              </tr>
            </thead>
            <tbody>
              {spectrum.map((bin, index) => (
                <tr key={bin.harmonic}>
                  <td>
                    <i
                      className={`coefficientDot coefficientDot--${index % 5}`}
                    />
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
