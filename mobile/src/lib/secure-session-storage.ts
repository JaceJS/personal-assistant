import AsyncStorage from "@react-native-async-storage/async-storage";
import * as aesjs from "aes-js";
import * as ExpoCrypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

// aes-js requires an exact 16/24/32-byte key; 32 bytes = AES-256.
const AES_KEY_BYTES = 32;

function cipherFor(key: Uint8Array) {
  return new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(1));
}

/**
 * Supabase `SupportedStorage` adapter for `mobile/src/lib/supabase.ts`.
 *
 * The session blob commonly exceeds SecureStore's ~2KB item limit, so it
 * can't be written there directly. Instead: a fresh AES key goes in
 * SecureStore (Keychain/Keystore, small), the encrypted session goes in
 * AsyncStorage (unlimited size, but plaintext-readable without the key).
 */
export class LargeSecureStore {
  async getItem(key: string): Promise<string | null> {
    const encryptedHex = await AsyncStorage.getItem(key);
    if (!encryptedHex) return null;

    const keyHex = await SecureStore.getItemAsync(key);
    if (!keyHex) return null;

    try {
      const decryptedBytes = cipherFor(aesjs.utils.hex.toBytes(keyHex)).decrypt(
        aesjs.utils.hex.toBytes(encryptedHex)
      );
      return aesjs.utils.utf8.fromBytes(decryptedBytes);
    } catch {
      // Corrupted ciphertext, or a stale plaintext value from before this
      // adapter existed — treat as no session instead of crashing the app.
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    // A new key every write: CTR mode's fixed counter is only safe when the
    // key is never reused to encrypt two different messages.
    const aesKey = await ExpoCrypto.getRandomBytesAsync(AES_KEY_BYTES);
    const encryptedBytes = cipherFor(aesKey).encrypt(aesjs.utils.utf8.toBytes(value));

    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(aesKey), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
    await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(encryptedBytes));
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}
