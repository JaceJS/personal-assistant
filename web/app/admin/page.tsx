"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  AdminApiError,
  type AiFeature,
  type AiTrace,
  type AiTraceStats,
  type AiTraceStatus,
  getTraceStats,
  listTraces,
} from "@/lib/adminApi";

const PAGE_SIZE = 50;
const FEATURES: AiFeature[] = ["voice_extraction", "receipt_extraction", "chat"];
const STATUSES: AiTraceStatus[] = ["success", "error"];

export default function AdminTracesPage() {
  const [feature, setFeature] = useState<AiFeature | "">("");
  const [status, setStatus] = useState<AiTraceStatus | "">("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<AiTrace[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AiTraceStats[]>([]);

  useEffect(() => {
    // Best-effort: if this 403s the list fetch below will too and already
    // shows that message -- no need to duplicate error handling here.
    getTraceStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listTraces({
      feature: feature || undefined,
      status: status || undefined,
      limit: PAGE_SIZE,
      offset,
    })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof AdminApiError ? err : new AdminApiError(0, "Request failed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [feature, status, offset]);

  if (error?.status === 403) {
    return <main className="admin-shell">Signed in, but not an admin.</main>;
  }

  return (
    <main className="admin-shell">
      <h1>AI Traces</h1>

      {stats.length > 0 && (
        <table className="admin-table admin-stats">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Status</th>
              <th>Count</th>
              <th>Avg latency</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((row) => (
              <tr key={`${row.feature}-${row.status}`}>
                <td>{row.feature}</td>
                <td className={`admin-status-${row.status}`}>{row.status}</td>
                <td>{row.count}</td>
                <td>{Math.round(row.avg_latency_ms)}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="admin-filters">
        <select
          value={feature}
          onChange={(e) => {
            setOffset(0);
            setFeature(e.target.value as AiFeature | "");
          }}
        >
          <option value="">All features</option>
          {FEATURES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setOffset(0);
            setStatus(e.target.value as AiTraceStatus | "");
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="admin-status-error">{error.message}</p>}
      {loading && <p>Loading…</p>}

      {!loading && !error && (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Feature</th>
                <th>Model</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Excerpt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((trace) => (
                <tr key={trace.id}>
                  <td>{new Date(trace.created_at).toLocaleString()}</td>
                  <td>{trace.feature}</td>
                  <td>{trace.model}</td>
                  <td className={`admin-status-${trace.status}`}>{trace.status}</td>
                  <td>{trace.latency_ms}ms</td>
                  <td>
                    <Link href={`/admin/traces/${trace.id}`}>
                      {(trace.response_excerpt ?? trace.error_message ?? "").slice(0, 80) || "—"}
                    </Link>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6}>No traces yet.</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="admin-pagination">
            <button
              type="button"
              className="admin-link-button"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </button>
            <span>
              {total === 0 ? 0 : offset + 1}-{Math.min(offset + PAGE_SIZE, total)} of {total}
            </span>
            <button
              type="button"
              className="admin-link-button"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </main>
  );
}
