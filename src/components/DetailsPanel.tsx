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
  const formula = useMemo(
    () =>
      katex.renderToString(pattern.formulaLatex, {
        throwOnError: false,
        displayMode: true,
      }),
    [pattern.formulaLatex],
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
              右へ流れる一本の波です。耳には同じ比率が音色として届きます。
            </p>
            <div className="observationRule" />
            <p className="quietNote">
              数式は景色の設計図です。光の膜、粒子の流れ、残響の呼吸まで、
              同じ時間を共有しています。
            </p>
          </section>
        ) : (
          <section className="mathSection">
            <div
              className="detailsFormula"
              dangerouslySetInnerHTML={{ __html: formula }}
            />
            <p>{pattern.education.mathematicalBody}</p>
            <dl className="parameterList">
              <div>
                <dt>基音</dt>
                <dd>{pattern.audio.fundamentalHz.toFixed(2)} Hz</dd>
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
            </dl>
          </section>
        )}

        <section className="dataSection">
          <div className="sectionLabel">
            <span>SPECTRUM</span>
            <span>解析的係数スペクトル</span>
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
            <span>WAVEFORM</span>
            <span>合成波形</span>
          </div>
          <WaveformCanvas audio={audio} playing={playing} />
        </section>

        <section className="coefficientSection">
          <div className="sectionLabel">
            <span>COEFFICIENTS</span>
            <span>解析的フーリエ係数</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>k</th>
                <th>n</th>
                <th>Hz</th>
                <th>Aₙ</th>
                <th>φₙ</th>
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
                  <td>−π/2</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </aside>
  );
}
