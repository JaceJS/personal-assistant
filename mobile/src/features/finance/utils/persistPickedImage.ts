import { Directory, File, Paths } from "expo-file-system";

import { generateId } from "@/lib/utils";

const DEFAULT_EXT = ".jpg";

function extensionOf(uri: string): string {
  const match = /\.[a-zA-Z0-9]+$/.exec(uri);
  return match ? match[0] : DEFAULT_EXT;
}

// Picker uris are transient cache files that can vanish before a retry.
export function persistPickedImage(sourceUri: string): string {
  const dir = new Directory(Paths.document, "receipts");
  if (!dir.exists) dir.create({ intermediates: true });

  const destFile = new File(dir, `${generateId()}${extensionOf(sourceUri)}`);
  new File(sourceUri).copy(destFile);
  return destFile.uri;
}
