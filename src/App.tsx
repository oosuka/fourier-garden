import { renderToString } from "katex";
import { lazy, Suspense, useMemo, type CSSProperties } from "react";

import {
  ChapterTransition,
  EntryScreen,
  ExperienceStatus,
  PatternPresentation,
} from "./app/AppPresentation";
import { ExperienceControls } from "./app/ExperienceControls";
import { useFourierGardenController } from "./app/useFourierGardenController";
import { CanvasStage } from "./components/CanvasStage";
import { ChapterAfterimage } from "./components/ChapterAfterimage";

const ExperienceQa = lazy(() => import("./qa/ExperienceQa"));

export function App() {
  const controller = useFourierGardenController();
  const {
    patterns,
    qaCapture,
    silentPlayback,
    captureFrame,
    seekForQa,
    patternIndex,
    pattern,
    transport,
    audio,
    entered,
    playing,
    startingPlayback,
    switchingChapter,
    transitionPattern,
    transitionSource,
    transitionEcho,
    captureSceneRef,
    transitionLeaving,
    detailsOpen,
    indexOpen,
    muted,
    toggleMute,
    toggleIndex,
    closeIndex,
    detailsHintVisible,
    fullscreen,
    volume,
    sceneStatus,
    sceneGeneration,
    sceneError,
    audioError,
    uiNotice,
    dismissNotice,
    interfaceHidden,
    revealUi,
    dismissDetailsHint,
    toggleDetails,
    closeDetails,
    handleEnter,
    togglePlayback,
    switchChapter,
    handleSceneStatus,
    handleSceneError,
    retryScene,
    retryAudio,
    continueSilently,
    handleVolume,
    toggleFullscreen,
  } = controller;
  const formula = useMemo(
    () =>
      renderToString(pattern.formulaLatex, {
        throwOnError: false,
        displayMode: true,
      }),
    [pattern.formulaLatex],
  );

  return (
    <main
      className={`app app--${pattern.kind} ${!entered ? "app--entry" : ""} ${detailsOpen || indexOpen ? "app--panel" : ""} ${detailsOpen ? "app--details" : ""} ${
        interfaceHidden ? "app--uiHidden" : ""
      }`}
      style={{ "--chapter-accent": pattern.observation.accent } as CSSProperties}
      onPointerMove={revealUi}
      onPointerDown={revealUi}
    >
      <CanvasStage
        key={pattern.id}
        pattern={pattern}
        transport={transport}
        playing={playing}
        sceneGeneration={sceneGeneration}
        onStatus={handleSceneStatus}
        onError={handleSceneError}
        onFrame={captureFrame}
        captureRef={captureSceneRef}
      />

      {transitionEcho && <ChapterAfterimage state={transitionEcho} />}

      <div className="edgeVignette" aria-hidden="true" />

      {transitionPattern && (
        <ChapterTransition
          pattern={transitionPattern}
          source={transitionSource}
          chapterCount={patterns.length}
          leaving={transitionLeaving}
        />
      )}

      {entered && <PatternPresentation pattern={pattern} formula={formula} />}
      <ExperienceStatus
        sceneStatus={sceneStatus}
        sceneError={sceneError}
        audioError={audioError}
        uiNotice={uiNotice}
        onDismissNotice={dismissNotice}
        entered={entered}
        onRetryScene={retryScene}
        onRetryAudio={retryAudio}
        onContinueSilent={continueSilently}
      />

      {entered && (
        <ExperienceControls
          patterns={patterns}
          indexOpen={indexOpen}
          muted={muted}
          onToggleMute={toggleMute}
          onToggleIndex={toggleIndex}
          onCloseIndex={closeIndex}
          playing={playing}
          startingPlayback={startingPlayback}
          volume={volume}
          detailsOpen={detailsOpen}
          detailsHintVisible={detailsHintVisible}
          fullscreen={fullscreen}
          pattern={pattern}
          chapterCount={patterns.length}
          chapterIndex={patternIndex}
          switchingChapter={switchingChapter}
          transport={transport}
          audio={audio}
          onTogglePlay={togglePlayback}
          onVolume={handleVolume}
          onSwitchChapter={(index) => void switchChapter(index)}
          onToggleDetails={toggleDetails}
          onDismissDetailsHint={dismissDetailsHint}
          onToggleFullscreen={() => void toggleFullscreen()}
          onCloseDetails={closeDetails}
        />
      )}

      {!entered && (
        <EntryScreen
          sceneLoading={sceneStatus !== "ready"}
          onEnter={(sound) => void handleEnter(sound)}
        />
      )}
      {qaCapture && (
        <Suspense fallback={null}>
          <ExperienceQa
            capture={qaCapture}
            audio={audio}
            transport={transport}
            chapter={pattern.id}
            muted={muted}
            volume={volume}
            silentPlayback={silentPlayback}
            ready={sceneStatus === "ready" && !switchingChapter}
            onSeek={seekForQa}
          />
        </Suspense>
      )}
    </main>
  );
}
