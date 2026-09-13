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
import { featureLabel, formatRelativeTime, formatSpeed, statusLabel } from "@/lib/adminFormat";

const PAGE_SIZE = 50;
const FEATURES: AiFeature[] = ["voice_extraction", "receipt_extraction", "chat"];
const STATUSES: AiTraceStatus[] = ["success", "error"];

function summarize(stats: AiTraceStats[]): { total: number; worked: number; failed: number } {
  return stats.reduce(
    (totals, row) => {
      totals.total += row.count;
      if (row.status === "success") totals.worked += row.count;
      else totals.failed += row.count;
      return totals;
    },
    { total: 0, worked: 0, failed: 0 }
  );
}

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

  const { total: totalCount, worked, failed } = summarize(stats);

  return (
    <main className="adm-shell">
      <div className="adm-page-header">
        <h1 className="adm-title">AI activity</h1>
      </div>

      {stats.length > 0 && (
        <div className="adm-kpis">
          <div className="adm-kpi">
            <p className="adm-kpi-label">Total</p>
            <p className="adm-kpi-value">{totalCount}</p>
          </div>
          <div className="adm-kpi adm-kpi--success">
            <p className="adm-kpi-label">Worked</p>
            <p className="adm-kpi-value">{worked}</p>
          </div>
          <div className="adm-kpi adm-kpi--danger">
            <p className="adm-kpi-label">Failed</p>
            <p className="adm-kpi-value">{failed}</p>
          </div>
        </div>
      )}

      <div className="adm-toolbar">
        <select
          value={feature}
          onChange={(e) => {
            setOffset(0);
            setFeature(e.target.value as AiFeature | "");
          }}
        >
          <option value="">All types</option>
          {FEATURES.map((f) => (
            <option key={f} value={f}>
              {featureLabel(f)}
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
          <option value="">Worked or failed</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {error?.status === 403 && <p className="adm-error-text">Signed in, but not an admin.</p>}
      {error && error.status !== 403 && <p className="adm-error-text">{error.message}</p>}
      {loading && <p>Loading…</p>}

      {!loading && !error && (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Result</th>
                  <th>Speed</th>
                </tr>
              </thead>
              <tbody>
                {items.map((trace) => (
                  <tr key={trace.id}>
                    <td className="adm-cell-mono">
                      <Link href={`/admin/traces/${trace.id}`}>
                        {formatRelativeTime(trace.created_at)}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/admin/traces/${trace.id}`}>{featureLabel(trace.feature)}</Link>
                    </td>
                    <td>
                      <Link href={`/admin/traces/${trace.id}`}>
                        <span className={`adm-pill adm-pill--${trace.status}`}>
                          {statusLabel(trace.status)}
                        </span>
                      </Link>
                    </td>
                    <td className="adm-cell-mono">
                      <Link href={`/admin/traces/${trace.id}`}>
                        {formatSpeed(trace.latency_ms)}
                      </Link>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="adm-empty">
                      Nothing here yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="adm-pagination">
            <button
              type="button"
              className="adm-link-button"
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
              className="adm-link-button"
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
