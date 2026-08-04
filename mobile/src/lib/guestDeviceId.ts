import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const GUEST_DEVICE_ID_KEY = "guest_ai_device_id";

// Keychain/Keystore-backed, unlike AsyncStorage, so a simple app reinstall
// doesn't silently reset the guest AI trial quota tied to this id.
export async function getOrCreateGuestDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(GUEST_DEVICE_ID_KEY);
  if (existing) return existing;

  const id = Crypto.randomUUID();
  await SecureStore.setItemAsync(GUEST_DEVICE_ID_KEY, id, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
  return id;
}
