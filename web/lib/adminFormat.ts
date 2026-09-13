/**
 * Presentation-only helpers for the admin panel: translate the raw trace
 * data (enum values, milliseconds, ISO timestamps) into what a
 * non-technical glance-through actually needs. Exact/raw values still live
 * in each page's "technical details" section.
 */
import type { AiFeature, AiTraceStatus } from "@/lib/adminApi";

const FEATURE_LABELS: Record<AiFeature, string> = {
  voice_extraction: "Voice note",
  receipt_extraction: "Receipt scan",
  chat: "Chat",
};

export function featureLabel(feature: AiFeature): string {
  return FEATURE_LABELS[feature];
}

export function statusLabel(status: AiTraceStatus): "Worked" | "Failed" {
  return status === "success" ? "Worked" : "Failed";
}

const FRIENDLY_ERROR: Record<AiFeature, string> = {
  voice_extraction: "Couldn't understand this voice note.",
  receipt_extraction: "Couldn't read this receipt.",
  chat: "Something went wrong replying to this chat.",
};

export function friendlyErrorMessage(feature: AiFeature): string {
  return FRIENDLY_ERROR[feature];
}

/** "842" -> "0.8s" -- one decimal, never raw milliseconds in a friendly view. */
export function formatSpeed(latencyMs: number): string {
  return `${(latencyMs / 1000).toFixed(1)}s`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "2 min ago", "3 hours ago", "5 days ago" -- falls back to a plain date
 * past 30 days, since "47 days ago" stops being a useful mental model. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  if (diffMs < MINUTE) return "just now";
  if (diffMs < HOUR) {
    const minutes = Math.floor(diffMs / MINUTE);
    return `${minutes} min ago`;
  }
  if (diffMs < DAY) {
    const hours = Math.floor(diffMs / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(diffMs / DAY);
  if (days <= 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  return new Date(iso).toLocaleDateString();
}
