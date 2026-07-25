import { persistToAppStorage } from "@/features/finance/utils/persistToAppStorage";

export function persistRecordedAudio(sourceUri: string): string {
  return persistToAppStorage(sourceUri, "audio", ".m4a");
}
