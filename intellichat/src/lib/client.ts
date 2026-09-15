// Browser helpers: image downscaling, recording, transcription and read-aloud playback.
import type { SupportedProvidersType, SpeechSettings } from './validators';

const MAX_IMAGE_SIDE = 1280;

/** Read an image file as a data URL, downscaled so requests stay small. */
export async function imageToDataUrl(file: File): Promise<string> {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('The file is not an image the browser can read.'));
    element.src = original;
  });
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height));
  if (scale === 1 && file.type !== 'image/gif') return original;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

async function readError(response: Response, fallback: string) {
  try {
    const { error } = await response.json();
    return new Error(error || fallback);
  } catch {
    return new Error(fallback);
  }
}

/** Send a recording or audio file for transcription; `apiKey` overrides the OpenAI key of the settings and .env. */
export async function transcribe(file: Blob, filename: string, providers: SupportedProvidersType, apiKey?: string): Promise<string> {
  const form = new FormData();
  form.append('file', file, filename);
  form.append('providers', JSON.stringify(providers));
  if (apiKey?.trim()) form.append('apiKey', apiKey.trim());
  const response = await fetch('/api/transcribe', { method: 'POST', body: form });
  if (!response.ok) throw await readError(response, 'Unable to transcribe the audio.');
  const { text } = await response.json();
  return text as string;
}

/** Ask for an image; resolves with a data URL. */
export async function requestImage(prompt: string, images: { provider: string; apiKey: string }, providers: SupportedProvidersType, signal?: AbortSignal): Promise<string> {
  const response = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, images, providers }),
    signal,
  });
  if (!response.ok) throw await readError(response, 'Unable to generate the image.');
  const { image } = await response.json();
  return image as string;
}

/** Microphone recording with MediaRecorder. */
export class Recorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  static supported() {
    return typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.recorder.start();
  }

  /** Stop recording; resolves with the audio blob and its file name. */
  stop(): Promise<{ blob: Blob; filename: string }> {
    return new Promise((resolve, reject) => {
      const recorder = this.recorder;
      if (!recorder) return reject(new Error('Not recording.'));
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(this.chunks, { type });
        this.stream?.getTracks().forEach((track) => track.stop());
        this.recorder = null;
        this.stream = null;
        resolve({ blob, filename: type.includes('webm') ? 'recording.webm' : type.includes('mp4') ? 'recording.mp4' : 'recording.ogg' });
      };
      recorder.stop();
    });
  }

  get recording() {
    return this.recorder?.state === 'recording';
  }
}

// One audio element for the whole app, so a new "read aloud" stops the previous one.
let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
const listeners = new Set<(playingId: string | null) => void>();
let playingId: string | null = null;

function notify(id: string | null) {
  playingId = id;
  listeners.forEach((listener) => listener(id));
}

export function onSpeechChange(listener: (playingId: string | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function currentlySpeaking() {
  return playingId;
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  notify(null);
}

/** Read a message aloud; calling it for the message being read stops it. */
export async function speak(id: string, text: string, speech: SpeechSettings, providers: SupportedProvidersType) {
  if (playingId === id) {
    stopSpeaking();
    return;
  }
  stopSpeaking();
  notify(id);
  const response = await fetch('/api/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speech, providers }),
  });
  if (!response.ok) {
    notify(null);
    throw await readError(response, 'Unable to read the message aloud.');
  }
  if (playingId !== id) return; // stopped while loading
  const blob = await response.blob();
  currentUrl = URL.createObjectURL(blob);
  currentAudio = new Audio(currentUrl);
  currentAudio.onended = () => stopSpeaking();
  currentAudio.onerror = () => stopSpeaking();
  await currentAudio.play();
}
