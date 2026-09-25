import {
  AUDIO_DEFAULT_FADE_IN_SECONDS,
  AUDIO_MASTER_FADE_OUT_SECONDS,
  AUDIO_START_LEAD_SECONDS,
  connectAudioOutputGraph,
  ROOM_IMPULSE_SEED,
  volumeToMasterGain,
} from "../audio/outputGraph";
import { createWorkletConfigureMessage } from "../audio/audioProgram";
import { patternRegistry } from "../patterns/registry";

const SAMPLE_RATE = 48_000;
const VOLUME = 0.35;
const POST_ROOM_PADDING_SECONDS = 0.5;
function requireElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (!element) throw new Error(`Audio QA page is missing ${selector}`);
  return element;
}

const reportElement = requireElement<HTMLPreElement>("#report");
const statusElement = requireElement<HTMLParagraphElement>("#status");
const downloadElement = requireElement<HTMLAnchorElement>("#downloadReport");

interface RangeMetrics {
  seconds: number;
  stereoRms: number;
  leftRms: number;
  rightRms: number;
  monoRms: number;
  samplePeak: number;
  finite: boolean;
}

function measureRange(
  left: Float32Array<ArrayBuffer>,
  right: Float32Array<ArrayBuffer>,
  start: number,
  end: number,
  sampleRate: number,
): RangeMetrics {
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(left.length, Math.ceil(end));
  let leftSquares = 0;
  let rightSquares = 0;
  let monoSquares = 0;
  let samplePeak = 0;
  let finite = true;
  for (let index = from; index < to; index += 1) {
    const l = left[index]!;
    const r = right[index]!;
    if (!Number.isFinite(l) || !Number.isFinite(r)) {
      finite = false;
      continue;
    }
    leftSquares += l * l;
    rightSquares += r * r;
    const mono = (l + r) * 0.5;
    monoSquares += mono * mono;
    samplePeak = Math.max(samplePeak, Math.abs(l), Math.abs(r));
  }
  const count = Math.max(1, to - from);
  return {
    seconds: count / sampleRate,
    stereoRms: Math.sqrt((leftSquares + rightSquares) / (count * 2)),
    leftRms: Math.sqrt(leftSquares / count),
    rightRms: Math.sqrt(rightSquares / count),
    monoRms: Math.sqrt(monoSquares / count),
    samplePeak,
    finite,
  };
}

function boundaryStep(
  left: Float32Array<ArrayBuffer>,
  right: Float32Array<ArrayBuffer>,
  frame: number,
): number {
  const index = Math.max(1, Math.min(left.length - 1, frame));
  return Math.max(
    Math.abs(left[index]! - left[index - 1]!),
    Math.abs(right[index]! - right[index - 1]!),
  );
}

type Pattern = (typeof patternRegistry)[number];
async function renderPattern(pattern: Pattern) {
  const program = pattern.audio.createProgram();
  const cycleSeconds = pattern.audio.score.cycleSeconds;
  const cycleStop = AUDIO_START_LEAD_SECONDS + cycleSeconds;
  const roomTailSeconds = program.graph.roomSeconds;
  const outputLength = Math.ceil(
    (cycleStop + roomTailSeconds + POST_ROOM_PADDING_SECONDS) * SAMPLE_RATE,
  );
  const context = new OfflineAudioContext({
    numberOfChannels: 2,
    length: outputLength,
    sampleRate: SAMPLE_RATE,
  });
  await context.audioWorklet.addModule("/audio/fourier-worklet.js?v=30");
  const source = new AudioWorkletNode(context, "fourier-garden-processor", {
    numberOfOutputs: 2,
    outputChannelCount: [2, 2],
  });
  let processorError: string | null = null;
  let processorRuntimeError = false;
  source.addEventListener("processorerror", () => {
    processorRuntimeError = true;
  });
  source.port.addEventListener("message", ({ data }: MessageEvent<unknown>) => {
    if (
      typeof data === "object" &&
      data !== null &&
      "type" in data &&
      data.type === "error" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      processorError = data.message;
    }
  });
  source.port.start();
  const postWorkletMessage = source.port.postMessage.bind(source.port);
  postWorkletMessage(createWorkletConfigureMessage(program.worklet));
  postWorkletMessage({ type: "start", seconds: 0, contextTime: AUDIO_START_LEAD_SECONDS });
  const dryGate = new GainNode(context, { gain: 1 });
  const wetGate = new GainNode(context, { gain: 1 });
  for (const gate of [dryGate, wetGate]) {
    gate.gain.setValueAtTime(1, 0);
    gate.gain.setValueAtTime(1, cycleStop);
    gate.gain.linearRampToValueAtTime(0, cycleStop + AUDIO_MASTER_FADE_OUT_SECONDS);
  }
  const output = connectAudioOutputGraph(
    context,
    {
      connectDry: (destination) => {
        source.connect(dryGate, 0, 0);
        dryGate.connect(destination);
      },
      connectWet: (destination) => {
        source.connect(wetGate, 1, 0);
        wetGate.connect(destination);
      },
    },
    program.graph,
  );
  const targetGain = volumeToMasterGain(VOLUME);
  output.master.gain.setValueAtTime(0, 0);
  output.master.gain.setValueAtTime(0, AUDIO_START_LEAD_SECONDS);
  output.master.gain.linearRampToValueAtTime(
    targetGain,
    AUDIO_START_LEAD_SECONDS + AUDIO_DEFAULT_FADE_IN_SECONDS,
  );

  const rendering = context.startRendering();
  await context.suspend(AUDIO_START_LEAD_SECONDS / 2);
  await context.resume();
  const buffer = await rendering;
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  source.port.close();
  source.disconnect();
  dryGate.disconnect();
  wetGate.disconnect();
  for (const node of output.nodes) node.disconnect();
  if (processorError) throw new Error(`${pattern.id}: ${processorError}`);

  const startFrame = Math.round(AUDIO_START_LEAD_SECONDS * SAMPLE_RATE);
  const cycleEndFrame = Math.round(cycleStop * SAMPLE_RATE);
  const roomEndFrame = Math.round((cycleStop + roomTailSeconds) * SAMPLE_RATE);
  const full = measureRange(left, right, 0, buffer.length, SAMPLE_RATE);
  const cycle = measureRange(left, right, startFrame, cycleEndFrame, SAMPLE_RATE);
  const tail = measureRange(left, right, cycleEndFrame, roomEndFrame, SAMPLE_RATE);
  const postRoom = measureRange(left, right, roomEndFrame, buffer.length, SAMPLE_RATE);
  const oneSecondRms: Array<RangeMetrics & { startSeconds: number }> = [];
  for (let start = startFrame; start < cycleEndFrame; start += SAMPLE_RATE) {
    oneSecondRms.push({
      startSeconds: (start - startFrame) / SAMPLE_RATE,
      ...measureRange(
        left,
        right,
        start,
        Math.min(cycleEndFrame, start + SAMPLE_RATE),
        SAMPLE_RATE,
      ),
    });
  }

  return {
    id: pattern.id,
    cycleSeconds,
    graph: program.graph,
    workletSourceChannels: ["dry stereo", "wet stereo"],
    processorRuntimeError,
    fullRender: full,
    fullCycle: cycle,
    oneSecondRms,
    reverbTail: tail,
    postRoomPadding: postRoom,
    boundaries: {
      firstOutputSamplePeak: Math.max(Math.abs(left[0]!), Math.abs(right[0]!)),
      transportStartStep: boundaryStep(left, right, startFrame),
      cycleStopStep: boundaryStep(left, right, cycleEndFrame),
      finalOutputSamplePeak: Math.max(
        Math.abs(left[left.length - 1]!),
        Math.abs(right[right.length - 1]!),
      ),
    },
  };
}

async function main() {
  const requestedId = new URLSearchParams(location.search).get("chapter");
  const patterns = requestedId
    ? patternRegistry.filter((pattern) => pattern.id === requestedId)
    : patternRegistry;
  if (patterns.length === 0) throw new Error(`Unknown chapter: ${requestedId}`);

  const chapters: Awaited<ReturnType<typeof renderPattern>>[] = [];
  await patterns.reduce<Promise<void>>(async (previous, pattern, index) => {
    await previous;
    statusElement.textContent = `48 kHz OfflineAudioContext: ${pattern.id} (${index + 1}/${patterns.length})`;
    chapters.push(await renderPattern(pattern));
    reportElement.textContent = JSON.stringify({ status: "rendering", chapters }, null, 2);
  }, Promise.resolve());

  const report = {
    schema: "fourier-garden-final-audio-output-v1",
    generatedAt: new Date().toISOString(),
    engine: "Chrome OfflineAudioContext + public/audio/fourier-worklet.js",
    sampleRateHz: SAMPLE_RATE,
    channels: 2,
    volume: VOLUME,
    masterGain: targetGainForReport(),
    roomImpulseSeed: ROOM_IMPULSE_SEED,
    startEpochSeconds: AUDIO_START_LEAD_SECONDS,
    prerollSeconds: AUDIO_START_LEAD_SECONDS,
    fadeInSeconds: AUDIO_DEFAULT_FADE_IN_SECONDS,
    applicationStopFadeSeconds: AUDIO_MASTER_FADE_OUT_SECONDS,
    outputMeasurementStopRamp:
      "QA dry/wet input gates ramp to zero over the same 0.16-second fade at cycle end; master remains at measured level while the convolver tail decays",
    postRoomPaddingSeconds: POST_ROOM_PADDING_SECONDS,
    outputChain: [
      "worklet dry output -> highpass -> highshelf -> lowpass -> dry gain",
      "worklet wet output -> highpass -> seeded convolver -> lowpass -> wet gain",
      "dry + wet -> compressor -> optional 4x waveshaper limiter -> analyser -> master gain -> destination",
    ],
    metricsNote:
      "samplePeak is sample peak, RMS values are linear RMS, and oneSecondRms covers each one-second full-cycle window. These are not true peak or LUFS.",
    chapters,
  };
  reportElement.textContent = JSON.stringify(report, null, 2);
  reportElement.dataset.status = "complete";
  downloadElement.href = URL.createObjectURL(
    new Blob([reportElement.textContent ?? ""], { type: "application/json" }),
  );
  downloadElement.download = `fourier-garden-final-audio-output-${report.generatedAt.slice(0, 10)}.json`;
  downloadElement.hidden = false;
  statusElement.textContent = `完了: ${chapters.length}章`;
}

function targetGainForReport(): number {
  return volumeToMasterGain(VOLUME);
}

void main().catch((error: unknown) => {
  reportElement.dataset.status = "error";
  reportElement.textContent =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  statusElement.textContent = "失敗";
});
