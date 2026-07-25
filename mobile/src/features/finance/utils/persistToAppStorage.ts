import { Directory, File, Paths } from "expo-file-system";

import { generateId } from "@/lib/utils";

const MEDIA_SUBDIRS = ["receipts", "audio"] as const;

function extensionOf(uri: string, defaultExt: string): string {
  const match = /\.[a-zA-Z0-9]+$/.exec(uri);
  return match ? match[0] : defaultExt;
}

// Picker/recorder uris are transient cache files that can vanish before a retry.
export function persistToAppStorage(sourceUri: string, subdir: string, defaultExt: string): string {
  const dir = new Directory(Paths.document, subdir);
  if (!dir.exists) dir.create({ intermediates: true });

  const destFile = new File(dir, `${generateId()}${extensionOf(sourceUri, defaultExt)}`);
  new File(sourceUri).copy(destFile);
  return destFile.uri;
}

// Chat history for receipt/voice messages isn't restored on app restart, so
// every persisted file is orphaned by the next cold start; sweep them then.
export function clearPersistedMedia(): void {
  for (const subdir of MEDIA_SUBDIRS) {
    const dir = new Directory(Paths.document, subdir);
    if (dir.exists) dir.delete();
  }
}
