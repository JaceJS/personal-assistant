import { supabase } from "@/lib/supabase";
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
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const method = init?.method ?? "GET";
  const authHeader = await getAuthHeader();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  logger.info("API request", { path, method });

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
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
