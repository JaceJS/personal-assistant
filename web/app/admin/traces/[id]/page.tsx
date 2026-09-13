"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminApiError, type AiTrace, getTrace } from "@/lib/adminApi";
import { featureLabel, formatSpeed, friendlyErrorMessage, statusLabel } from "@/lib/adminFormat";

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

  return (
    <main className="adm-shell">
      <Link href="/admin" className="adm-back-link">
        &larr; Back
      </Link>

      {loading && <p>Loading…</p>}
      {error?.status === 403 && <p className="adm-error-text">Signed in, but not an admin.</p>}
      {error && error.status !== 403 && <p className="adm-error-text">{error.message}</p>}

      {trace && (
        <div className="adm-summary-card">
          <p className="adm-summary-kind">{featureLabel(trace.feature)}</p>
          <p className={`adm-summary-result adm-summary-result--${trace.status}`}>
            {trace.status === "success" ? "✓" : "✕"} {statusLabel(trace.status)} in{" "}
            {formatSpeed(trace.latency_ms)}
          </p>

          {trace.status === "success" ? (
            <>
              <p className="adm-section-label">What the AI read</p>
              <pre className="adm-excerpt">
                {trace.response_excerpt ?? "No excerpt saved for this one."}
              </pre>
            </>
          ) : (
            <>
              <p className="adm-section-label">What went wrong</p>
              <pre className="adm-excerpt">{friendlyErrorMessage(trace.feature)}</pre>
            </>
          )}

          <details className="adm-tech-details">
            <summary>Technical details</summary>
            <dl className="adm-tech-dl">
              <dt>Trace id</dt>
              <dd>{trace.id}</dd>
              <dt>User id</dt>
              <dd>{trace.user_id}</dd>
              <dt>Model</dt>
              <dd>{trace.model}</dd>
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
              <dd>{new Date(trace.created_at).toISOString()}</dd>
              {trace.error_message && (
                <>
                  <dt>Raw error</dt>
                  <dd>{trace.error_message}</dd>
                </>
              )}
            </dl>
          </details>
        </div>
      )}
    </main>
  );
}
