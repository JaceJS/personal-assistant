interface LocalRowMeta {
  updated_at: string;
  pending_sync: boolean;
}
interface ServerRowMeta {
  updated_at: string;
}

// Decides whether an incoming server row should overwrite the local mirror.
// A clean local row (already synced) always defers to the server. A local
// row with an unsynced edit only loses if the server's own change is newer
// (last-write-wins) — otherwise the pending local edit is preserved and will
// reach the server via the outbox instead.
export function shouldApplyServerRow(local: LocalRowMeta | null, server: ServerRowMeta): boolean {
  if (local === null) return true;
  if (!local.pending_sync) return true;
  return new Date(server.updated_at).getTime() > new Date(local.updated_at).getTime();
}
