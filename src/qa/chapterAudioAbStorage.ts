export const AUDIO_AB_SESSION_STORAGE_PREFIX = "fourier-garden:audio-ab-session:";

// Storage revision r3 starts a clean pass after the 2026-08-13 speaker remediation.
export const AUDIO_AB_SESSION_STORAGE_KEY = `${AUDIO_AB_SESSION_STORAGE_PREFIX}v4:r3`;

export function clearRetiredListeningSessions(storage: Storage): void {
  const retiredKeys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(AUDIO_AB_SESSION_STORAGE_PREFIX) && key !== AUDIO_AB_SESSION_STORAGE_KEY) {
      retiredKeys.push(key);
    }
  }
  for (const key of retiredKeys) storage.removeItem(key);
}
