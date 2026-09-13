import { shouldApplyServerRow } from "../syncMerge";

describe("shouldApplyServerRow", () => {
  it("applies the server row when there is no local row yet", () => {
    expect(shouldApplyServerRow(null, { updated_at: "2026-01-01T00:00:00.000Z" })).toBe(true);
  });

  it("applies the server row when the local row has no unsynced edit", () => {
    const local = { updated_at: "2020-01-01T00:00:00.000Z", pending_sync: false };
    expect(shouldApplyServerRow(local, { updated_at: "2026-01-01T00:00:00.000Z" })).toBe(true);
  });

  it("keeps the local row when it has an unsynced edit newer than the server row", () => {
    const local = { updated_at: "2026-06-01T00:00:00.000Z", pending_sync: true };
    expect(shouldApplyServerRow(local, { updated_at: "2026-01-01T00:00:00.000Z" })).toBe(false);
  });

  it("applies the server row even over an unsynced local edit, if the server row is newer", () => {
    const local = { updated_at: "2026-01-01T00:00:00.000Z", pending_sync: true };
    expect(shouldApplyServerRow(local, { updated_at: "2026-06-01T00:00:00.000Z" })).toBe(true);
  });
});
