import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { LargeSecureStore } from "../secure-session-storage";

jest.mock("expo-secure-store", () => {
  const secureStore = new Map<string, string>();
  return {
    __secureStore: secureStore,
    WHEN_UNLOCKED: "whenUnlocked",
    getItemAsync: jest.fn((key: string) => Promise.resolve(secureStore.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      secureStore.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key: string) => {
      secureStore.delete(key);
      return Promise.resolve();
    }),
  };
});

jest.mock("@react-native-async-storage/async-storage", () => {
  const asyncStore = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      __asyncStore: asyncStore,
      getItem: jest.fn((key: string) => Promise.resolve(asyncStore.get(key) ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        asyncStore.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        asyncStore.delete(key);
        return Promise.resolve();
      }),
    },
  };
});

jest.mock("expo-crypto", () => ({
  getRandomBytesAsync: jest.fn((byteCount: number) =>
    Promise.resolve(
      jest.requireActual<typeof import("crypto")>("crypto").randomBytes(byteCount)
    )
  ),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const secureStoreMap = (SecureStore as any).__secureStore as Map<string, string>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asyncStoreMap = (AsyncStorage as any).__asyncStore as Map<string, string>;

describe("LargeSecureStore", () => {
  let store: LargeSecureStore;

  beforeEach(() => {
    store = new LargeSecureStore();
    secureStoreMap.clear();
    asyncStoreMap.clear();
  });

  it("round-trips a value through setItem/getItem", async () => {
    const value = JSON.stringify({ access_token: "abc", refresh_token: "def" });

    await store.setItem("supabase.session", value);
    const result = await store.getItem("supabase.session");

    expect(result).toBe(value);
  });

  it("never stores the plaintext value in AsyncStorage", async () => {
    await store.setItem("supabase.session", JSON.stringify({ access_token: "super-secret" }));

    const raw = await AsyncStorage.getItem("supabase.session");

    expect(raw).not.toContain("super-secret");
  });

  it("stores the AES key in SecureStore, not in AsyncStorage", async () => {
    await store.setItem("supabase.session", "some-value");

    expect(await SecureStore.getItemAsync("supabase.session")).not.toBeNull();
  });

  it("returns null for a key that was never set", async () => {
    const result = await store.getItem("missing-key");

    expect(result).toBeNull();
  });

  it("returns null (not throw) when the ciphertext is corrupted", async () => {
    await store.setItem("supabase.session", "value");
    await AsyncStorage.setItem("supabase.session", "not-valid-hex-zzz");

    const result = await store.getItem("supabase.session");

    expect(result).toBeNull();
  });

  it("returns null (not throw) when the AES key is missing but ciphertext exists", async () => {
    await store.setItem("supabase.session", "value");
    await SecureStore.deleteItemAsync("supabase.session");

    const result = await store.getItem("supabase.session");

    expect(result).toBeNull();
  });

  it("removeItem clears both the ciphertext and the key", async () => {
    await store.setItem("supabase.session", "value");

    await store.removeItem("supabase.session");

    expect(await AsyncStorage.getItem("supabase.session")).toBeNull();
    expect(await SecureStore.getItemAsync("supabase.session")).toBeNull();
  });
});
