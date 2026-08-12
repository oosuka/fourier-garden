import type { AudioEngine } from "../audio/AudioEngine";
import { ControlBar } from "../components/ControlBar";
import { DetailsPanel } from "../components/DetailsPanel";
import type { Transport } from "../core/transport";
import type { PatternDefinition } from "../patterns/contracts";

interface ExperienceControlsProps {
  playing: boolean;
  volume: number;
  detailsOpen: boolean;
  detailsHintVisible: boolean;
  fullscreen: boolean;
  pattern: PatternDefinition;
  chapterCount: number;
  chapterIndex: number;
  switchingChapter: boolean;
  transport: Transport;
  audio: AudioEngine;
  onTogglePlay: () => void;
  onVolume: (value: number) => void;
  onSwitchChapter: (index: number) => void;
  onToggleDetails: () => void;
  onDismissDetailsHint: () => void;
  onToggleFullscreen: () => void;
  onCloseDetails: () => void;
}

export function ExperienceControls({
  playing,
  volume,
  detailsOpen,
  detailsHintVisible,
  fullscreen,
  pattern,
  chapterCount,
  chapterIndex,
  switchingChapter,
  transport,
  audio,
  onTogglePlay,
  onVolume,
  onSwitchChapter,
  onToggleDetails,
  onDismissDetailsHint,
  onToggleFullscreen,
  onCloseDetails,
}: ExperienceControlsProps) {
  return (
    <>
      <div className="interfaceLayer controlsLayer">
        <ControlBar
          playing={playing}
          volume={volume}
          detailsOpen={detailsOpen}
          detailsHintVisible={detailsHintVisible}
          fullscreen={fullscreen}
          pattern={pattern}
          chapterCount={chapterCount}
          chapterIndex={chapterIndex}
          switchingChapter={switchingChapter}
          transport={transport}
          onTogglePlay={onTogglePlay}
          onVolume={onVolume}
          onPreviousChapter={() => onSwitchChapter(chapterIndex - 1)}
          onNextChapter={() => onSwitchChapter(chapterIndex + 1)}
          onToggleDetails={onToggleDetails}
          onDismissDetailsHint={onDismissDetailsHint}
          onToggleFullscreen={onToggleFullscreen}
        />
      </div>

      <DetailsPanel open={detailsOpen} pattern={pattern} audio={audio} onClose={onCloseDetails} />
    </>
  );
}
