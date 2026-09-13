"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminApiError, type AiTrace, getTrace } from "@/lib/adminApi";

export default function AdminTraceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trace, setTrace] = useState<AiTrace | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getTrace(id)
      .then((result) => {
        if (!cancelled) setTrace(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof AdminApiError ? err : new AdminApiError(0, "Request failed"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error?.status === 403) {
    return <main className="admin-shell">Signed in, but not an admin.</main>;
  }

  return (
    <main className="admin-shell admin-detail">
      <p>
        <Link href="/admin">&larr; Back to traces</Link>
      </p>
      <h1>Trace detail</h1>

      {loading && <p>Loading…</p>}
      {error && <p className="admin-status-error">{error.message}</p>}

      {trace && (
        <>
          <dl>
            <dt>Id</dt>
            <dd>{trace.id}</dd>
            <dt>User id</dt>
            <dd>{trace.user_id}</dd>
            <dt>Feature</dt>
            <dd>{trace.feature}</dd>
            <dt>Model</dt>
            <dd>{trace.model}</dd>
            <dt>Status</dt>
            <dd className={`admin-status-${trace.status}`}>{trace.status}</dd>
            <dt>Latency</dt>
            <dd>{trace.latency_ms}ms</dd>
            <dt>Tokens (prompt / completion)</dt>
            <dd>
              {trace.prompt_tokens ?? "—"} / {trace.completion_tokens ?? "—"}
            </dd>
            <dt>Linked entity</dt>
            <dd>
              {trace.linked_entity_type ?? "—"} {trace.linked_entity_id ?? ""}
            </dd>
            <dt>Created at</dt>
            <dd>{new Date(trace.created_at).toLocaleString()}</dd>
          </dl>

          {trace.response_excerpt && (
            <>
              <h2>Response</h2>
              <pre>{trace.response_excerpt}</pre>
            </>
          )}
          {trace.error_message && (
            <>
              <h2>Error</h2>
              <pre>{trace.error_message}</pre>
            </>
          )}
        </>
      )}
    </main>
  );
}
