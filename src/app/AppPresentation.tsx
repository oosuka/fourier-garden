import { AlertCircle, AudioLines, LoaderCircle } from "lucide-react";

import type { PatternDefinition } from "../patterns/contracts";

export function ChapterTransition({
  pattern,
  source,
  chapterCount,
  leaving,
}: {
  pattern: PatternDefinition;
  source: PatternDefinition | null;
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
      {source && (
        <div className="chapterConnection">
          <span>
            {source.title.en} <span aria-hidden="true">↗</span>
          </span>
          <p>
            {source.observation.related.find((relation) => relation.id === pattern.id)?.reason ??
              `${source.observation.subject}から、${pattern.observation.subject}へ。`}
          </p>
        </div>
      )}

      <div className="chapterTransitionNote">
        <span>OBSERVATION NOTE</span>
        <strong>{pattern.education.gentleTitle}</strong>
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
        <h1>
          Fourier Garden<span>II</span>
        </h1>
        <p>MATHEMATICS IN RESONANCE</p>
      </header>
      <div className="chapterHeading interfaceLayer">
        <span>STUDY {String(pattern.order).padStart(2, "0")}</span>
        <h2>{pattern.title.en}</h2>
        <p>{pattern.title.ja}</p>
      </div>
      <section className="formulaBlock interfaceLayer" aria-label="この章の数式">
        <span className="eyebrow">{pattern.presentation.formulaEyebrow}</span>
        <div className="mainFormula" dangerouslySetInnerHTML={{ __html: formula }} />
        <p>{pattern.observation.invitation}</p>
      </section>
    </>
  );
}

export function ExperienceStatus({
  sceneStatus,
  sceneError,
  audioError,
  uiNotice,
  onDismissNotice,
  entered,
  onRetryScene,
  onRetryAudio,
  onContinueSilent,
}: {
  sceneStatus: "loading" | "ready" | "error";
  sceneError: string;
  audioError: string;
  uiNotice: string;
  onDismissNotice: () => void;
  entered: boolean;
  onRetryScene: () => void;
  onRetryAudio: () => void;
  onContinueSilent: () => void;
}) {
  return (
    <>
      {sceneStatus !== "ready" && (
        <div className="sceneStatus" role={sceneStatus === "error" ? "alert" : "status"}>
          {sceneStatus === "loading" ? (
            <>
              <LoaderCircle className="spin" aria-hidden="true" />
              <span>光の庭を整えています</span>
            </>
          ) : (
            <>
              <AlertCircle aria-hidden="true" />
              <div>
                <span>光の庭を開けませんでした</span>
                <button type="button" data-action="retry-scene" onClick={onRetryScene}>
                  もう一度ひらく
                </button>
                {sceneError && (
                  <details>
                    <summary>詳細</summary>
                    <p>{sceneError}</p>
                  </details>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {audioError && entered && (
        <div className="audioNotice" role="alert">
          <AlertCircle aria-hidden="true" />
          <div>
            <span>音声を開始できませんでした</span>
            <div className="noticeActions">
              <button type="button" data-action="retry-audio" onClick={onRetryAudio}>
                音声を再試行
              </button>
              <button type="button" data-action="continue-silent" onClick={onContinueSilent}>
                音なしで鑑賞する
              </button>
            </div>
          </div>
        </div>
      )}
      {uiNotice && (
        <output className="audioNotice">
          <AlertCircle aria-hidden="true" />
          <div>
            <span>{uiNotice}</span>
            <div className="noticeActions">
              <button type="button" data-action="dismiss-notice" onClick={onDismissNotice}>
                閉じる
              </button>
            </div>
          </div>
        </output>
      )}
    </>
  );
}

export function EntryScreen({
  sceneLoading,
  onEnter,
}: {
  sceneLoading: boolean;
  onEnter: (sound: boolean) => void;
}) {
  return (
    <section className="entryScreen" aria-label="Fourier Gardenへ入る">
      <div className="entryEdition">
        <span>AN AUDIOVISUAL GARDEN</span>
        <span>EDITION II · 10 STUDIES</span>
      </div>
      <div className="entryCopy">
        <p className="entryEyebrow">MATHEMATICS IN RESONANCE</p>
        <h1>
          Fourier
          <br />
          <em>Garden.</em>
        </h1>
        <p className="entryJapanese">
          数がめぐり、音が生まれ、
          <br />
          光の庭がひらく。
        </p>
        <p className="entryDescription">
          円の重なりから、波、素数、無限の気配へ。
          <br />
          十の数理風景を、見て、聴いて、ほどいていく。
        </p>
        <div className="entryActions">
          <button
            type="button"
            className="enterButton"
            onClick={() => onEnter(true)}
            disabled={sceneLoading}
          >
            <AudioLines aria-hidden="true" />
            <span>
              {sceneLoading ? "庭を準備しています" : "ENTER FOURIER GARDEN"}
              <small>音と光の観察をはじめる</small>
            </span>
            <span aria-hidden="true">↗</span>
          </button>
          <button
            type="button"
            className="silentEntry"
            data-action="enter-silent"
            disabled={sceneLoading}
            onClick={() => onEnter(false)}
          >
            音なしで入る <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      <div className="entryFooter">
        <p>ひとつの数学から、音と光へ。</p>
        <span>音は操作後に始まります。いつでも消音できます。</span>
      </div>
    </section>
  );
}
