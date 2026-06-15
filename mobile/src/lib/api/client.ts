import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { API_URL, API_TIMEOUT_MS } from "@/constants/config";
import { logger } from "@/lib/logger";

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  // Prefer the store session — set synchronously by onAuthStateChange, never stale.
  // Fall back to getSession() for cold starts before onAuthStateChange fires.
  const storeToken = useAuthStore.getState().session?.access_token;
  const token =
    storeToken ?? (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const method = init?.method ?? "GET";
  const authHeader = await getAuthHeader();
  const isFormData = init?.body instanceof FormData;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  logger.info("API request", { path, method });

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...authHeader,
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      const error = new ApiError(response.status, body);
      logger.error("API request failed", error, { path, status: response.status, method });
      throw error;
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      logger.error("API request timed out", err, { path, method });
      throw new ApiError(408, "Request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export { ApiError };
