import { persistToAppStorage } from "@/features/finance/utils/persistToAppStorage";

export function persistPickedImage(sourceUri: string): string {
  return persistToAppStorage(sourceUri, "receipts", ".jpg");
}
