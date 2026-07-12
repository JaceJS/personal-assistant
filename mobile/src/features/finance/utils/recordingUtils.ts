/** Recordings shorter than this are discarded instead of uploaded —
 * they carry no usable speech and trip the backend's empty/invalid checks. */
export const MIN_RECORDING_MS = 700;

export function isRecordingTooShort(durationMs: number): boolean {
  return durationMs < MIN_RECORDING_MS;
}

export function formatRecordingDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
