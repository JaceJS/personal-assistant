import { apiFetch } from "@/lib/api/client";
import type { ApiResponse } from "@/features/finance/types";

export interface AvatarUploadResponse {
  url: string;
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function uploadAvatar(imageUri: string): Promise<AvatarUploadResponse> {
  const ext = /\.(\w+)$/.exec(imageUri)?.[1]?.toLowerCase() ?? "jpg";
  const type = MIME_BY_EXT[ext] ?? "image/jpeg";

  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: `avatar.${ext}`,
    type,
  } as unknown as Blob);

  return apiFetch<ApiResponse<AvatarUploadResponse>>("/api/v1/users/me/avatar", {
    method: "PATCH",
    body: formData,
  }).then((r) => r.data);
}
