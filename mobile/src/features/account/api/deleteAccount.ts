import { apiFetch } from "@/lib/api/client";

export function deleteAccount(): Promise<void> {
  return apiFetch<void>("/api/v1/users/me", { method: "DELETE" });
}
