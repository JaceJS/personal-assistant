import * as SecureStore from "expo-secure-store";

import { getOrCreateGuestDeviceId } from "../guestDeviceId";

jest.mock("expo-crypto", () => ({
  randomUUID: () => jest.requireActual<typeof import("crypto")>("crypto").randomUUID(),
}));

jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    WHEN_UNLOCKED: "whenUnlocked",
    getItemAsync: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storeMap = (SecureStore as any).__store as Map<string, string>;

describe("getOrCreateGuestDeviceId", () => {
  beforeEach(() => {
    storeMap.clear();
    jest.clearAllMocks();
  });

  it("generates and persists a new id when none exists yet", async () => {
    const id = await getOrCreateGuestDeviceId();

    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "guest_ai_device_id",
      id,
      expect.any(Object)
    );
  });

  it("returns the same id on a second call without regenerating", async () => {
    const first = await getOrCreateGuestDeviceId();
    const second = await getOrCreateGuestDeviceId();

    expect(second).toBe(first);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  });

  it("reads an existing id from SecureStore instead of generating one", async () => {
    storeMap.set("guest_ai_device_id", "11111111-1111-4111-8111-111111111111");

    const id = await getOrCreateGuestDeviceId();

    expect(id).toBe("11111111-1111-4111-8111-111111111111");
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
