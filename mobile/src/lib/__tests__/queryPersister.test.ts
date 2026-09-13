import type { Query } from "@tanstack/react-query";
import { shouldPersistQuery } from "@/lib/queryPersister";

function makeQuery(queryKey: unknown[], status: "success" | "error" | "pending"): Query {
  return { queryKey, state: { status } } as unknown as Query;
}

describe("shouldPersistQuery", () => {
  it.each(["accounts", "transactions", "categories", "budget", "savings-goals"])(
    "persists successful %s queries",
    (key) => {
      expect(shouldPersistQuery(makeQuery([key], "success"))).toBe(true);
    },
  );

  it("does not persist queries outside the finance whitelist", () => {
    expect(shouldPersistQuery(makeQuery(["ai-insight"], "success"))).toBe(false);
    expect(shouldPersistQuery(makeQuery(["chat-messages", "session-1"], "success"))).toBe(false);
  });

  it("does not persist a query that hasn't succeeded", () => {
    expect(shouldPersistQuery(makeQuery(["accounts"], "pending"))).toBe(false);
    expect(shouldPersistQuery(makeQuery(["accounts"], "error"))).toBe(false);
  });
});
