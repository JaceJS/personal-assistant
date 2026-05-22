import { supabase } from "@/lib/supabase";
import { API_URL } from "@/constants/config";
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
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new ApiError(response.status, body);
    logger.error("API request failed", error, {
      path,
      status: response.status,
      method: init?.method ?? "GET",
    });
    throw error;
  }

  return response.json() as Promise<T>;
}

export { ApiError };
