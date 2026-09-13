import type { Query } from "@tanstack/react-query";

// Only finance-domain reads are worth persisting: they're what users hit on
// every app open, and they're safe to show stale-while-revalidate. AI/chat
// queries stay memory-only.
const PERSISTED_QUERY_KEYS = ["accounts", "transactions", "categories", "budget", "savings-goals"];

export function shouldPersistQuery(query: Query): boolean {
  if (query.state.status !== "success") return false;
  return PERSISTED_QUERY_KEYS.includes(query.queryKey[0] as string);
}
