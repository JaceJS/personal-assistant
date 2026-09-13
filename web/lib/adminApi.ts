/**
 * Fetch wrapper for the backend's admin AI-observability endpoints
 * (see backend/app/domains/admin). Attaches the signed-in admin's Supabase
 * JWT; the backend is the real gate (ADMIN_ALLOWLIST), this just calls it.
 */
import { supabase } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type AiFeature = "voice_extraction" | "receipt_extraction" | "chat";
export type AiTraceStatus = "success" | "error";

export interface AiTrace {
  id: string;
  user_id: string;
  feature: AiFeature;
  model: string;
  status: AiTraceStatus;
  latency_ms: number;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  response_excerpt: string | null;
  error_message: string | null;
  created_at: string;
}

interface ApiEnvelope<T> {
  message: string;
  data: T | null;
  meta: { total: number; limit: number; offset: number } | null;
}

export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new AdminApiError(401, "Not signed in");
  }
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string): Promise<ApiEnvelope<T>> {
  const headers = await authHeader();
  const response = await fetch(`${API_URL}${path}`, { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body?.message ??
      (response.status === 403 ? "Signed in, but not an admin" : "Request failed");
    throw new AdminApiError(response.status, message);
  }
  return response.json() as Promise<ApiEnvelope<T>>;
}

export interface ListTracesParams {
  feature?: AiFeature;
  status?: AiTraceStatus;
  limit?: number;
  offset?: number;
}

export interface ListTracesResult {
  items: AiTrace[];
  total: number;
  limit: number;
  offset: number;
}

export async function listTraces(params: ListTracesParams = {}): Promise<ListTracesResult> {
  const query = new URLSearchParams();
  if (params.feature) query.set("feature", params.feature);
  if (params.status) query.set("status", params.status);
  query.set("limit", String(params.limit ?? 50));
  query.set("offset", String(params.offset ?? 0));

  const envelope = await request<AiTrace[]>(`/api/v1/admin/traces?${query.toString()}`);
  return {
    items: envelope.data ?? [],
    total: envelope.meta?.total ?? 0,
    limit: envelope.meta?.limit ?? params.limit ?? 50,
    offset: envelope.meta?.offset ?? params.offset ?? 0,
  };
}

export async function getTrace(id: string): Promise<AiTrace> {
  const envelope = await request<AiTrace>(`/api/v1/admin/traces/${id}`);
  if (!envelope.data) {
    throw new AdminApiError(404, "Trace not found");
  }
  return envelope.data;
}

export interface AiTraceStats {
  feature: AiFeature;
  status: AiTraceStatus;
  count: number;
  avg_latency_ms: number;
}

export async function getTraceStats(): Promise<AiTraceStats[]> {
  const envelope = await request<AiTraceStats[]>("/api/v1/admin/traces/stats");
  return envelope.data ?? [];
}
