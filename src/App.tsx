import { renderToString } from "katex";
import { useMemo } from "react";

import {
  ChapterTransition,
  EntryScreen,
  ExperienceStatus,
  PatternPresentation,
} from "./app/AppPresentation";
import { ExperienceControls } from "./app/ExperienceControls";
import { useFourierGardenController } from "./app/useFourierGardenController";
import { CanvasStage } from "./components/CanvasStage";

export function App() {
  const controller = useFourierGardenController();
  const {
    patterns,
    patternIndex,
    pattern,
    transport,
    audio,
    entered,
    playing,
    switchingChapter,
    transitionPattern,
    transitionLeaving,
    detailsOpen,
    detailsHintVisible,
    fullscreen,
    volume,
    sceneStatus,
    sceneGeneration,
    sceneError,
    audioError,
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
      className={`app app--${pattern.kind} ${detailsOpen ? "app--details" : ""} ${
        interfaceHidden ? "app--uiHidden" : ""
      }`}
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
      />

      <div className="edgeVignette" aria-hidden="true" />

      {transitionPattern && (
        <ChapterTransition
          pattern={transitionPattern}
          chapterCount={patterns.length}
          leaving={transitionLeaving}
        />
      )}

      <PatternPresentation pattern={pattern} formula={formula} />
      <ExperienceStatus
        sceneStatus={sceneStatus}
        sceneError={sceneError}
        audioError={audioError}
        entered={entered}
      />

      {entered && (
        <ExperienceControls
          playing={playing}
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
        <EntryScreen sceneLoading={sceneStatus === "loading"} onEnter={() => void handleEnter()} />
      )}
    </main>
  );
}
