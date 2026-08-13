import { AlertCircle, AudioLines, LoaderCircle } from "lucide-react";

import type { PatternDefinition } from "../patterns/contracts";

export function ChapterTransition({
  pattern,
  chapterCount,
  leaving,
}: {
  pattern: PatternDefinition;
  chapterCount: number;
  leaving: boolean;
}) {
  return (
    <section
      className={`chapterTransition ${leaving ? "chapterTransition--leaving" : ""}`}
      aria-live="polite"
      aria-label="章を切り替えています"
    >
      <span>
        CHAPTER {String(pattern.order).padStart(2, "0")} / {String(chapterCount).padStart(2, "0")}
      </span>
      <h2>{pattern.title.en}</h2>
      <p>{pattern.title.ja}</p>
      <small>{pattern.subtitle.ja}</small>
      <div className="chapterTransitionNote">
        <span>OBSERVATION NOTE</span>
        <strong>{pattern.education.gentleTitle}</strong>
        <small>DETAILS · D</small>
      </div>
    </section>
  );
}

export function PatternPresentation({
  pattern,
  formula,
}: {
  pattern: PatternDefinition;
  formula: string;
}) {
  return (
    <>
      <header className="brandBlock interfaceLayer">
        <h1>FOURIER GARDEN</h1>
        <p>{pattern.presentation.observatoryLabel}</p>
        <small>{pattern.subtitle.ja}</small>
      </header>

      <div className="mathAnnotations interfaceLayer" aria-hidden="true">
        <span className="annotationContext">{pattern.presentation.annotationContext}</span>
        {pattern.presentation.annotations.map((annotation, index) => (
          <span
            className={`annotation annotation--${["one", "two", "three", "four"][index]}`}
            key={annotation.label}
          >
            <b>{annotation.label}</b>
            <small>{annotation.value}</small>
          </span>
        ))}
      </div>

      <section className="formulaBlock interfaceLayer">
        <span className="eyebrow">{pattern.presentation.formulaEyebrow}</span>
        <div className="mainFormula" dangerouslySetInnerHTML={{ __html: formula }} />
        <p>{pattern.presentation.formulaSummary}</p>
      </section>

      <section className="poeticBlock interfaceLayer">
        <span>{pattern.presentation.poeticEyebrow}</span>
        <p>
          {pattern.presentation.poeticLines.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </p>
      </section>
    </>
  );
}

export function ExperienceStatus({
  sceneStatus,
  sceneError,
  audioError,
  entered,
}: {
  sceneStatus: "loading" | "ready" | "error";
  sceneError: string;
  audioError: string;
  entered: boolean;
}) {
  return (
    <>
      {sceneStatus !== "ready" && (
        <div className="sceneStatus">
          {sceneStatus === "loading" ? (
            <>
              <LoaderCircle className="spin" aria-hidden="true" />
              <span>INITIALIZING CHAPTER FIELD</span>
            </>
          ) : (
            <>
              <AlertCircle aria-hidden="true" />
              <span>{sceneError || "描画を開始できませんでした"}</span>
            </>
          )}
        </div>
      )}

      {audioError && entered && (
        <div className="audioNotice interfaceLayer">
          <AlertCircle aria-hidden="true" />
          <span>音声を開始できませんでした</span>
        </div>
      )}
    </>
  );
}

export function EntryScreen({
  sceneLoading,
  onEnter,
}: {
  sceneLoading: boolean;
  onEnter: () => void;
}) {
  return (
    <section className="entryScreen">
      <div className="entryMark">
        <span>01</span>
        <i />
        <span>∞</span>
      </div>
      <p className="entryEyebrow">FINITE FOURIER SERIES · PHASOR SYNTHESIS</p>
      <h2>FOURIER GARDEN</h2>
      <p className="entryJapanese">
        複素平面を回る13のフェーザが、
        <br />
        虚部へ射影され、ひとつの波になる。
      </p>
      <button className="enterButton" onClick={onEnter} disabled={sceneLoading}>
        <AudioLines aria-hidden="true" />
        <span>
          ENTER FOURIER GARDEN
          <small>音と光の観測をはじめる</small>
        </span>
      </button>
      <p className="entryHint">Mac built-in speakers · Space: pause · D: details · F: fullscreen</p>
    </section>
  );
}
