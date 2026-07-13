import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { create } from "zustand";

import i18n from "@/i18n";
import {
  SUPPORTED_LANGUAGES,
  SYSTEM_FALLBACK_LANGUAGE,
  type AppLanguage,
} from "@/i18n/registry";
import { scheduleDailyReminder } from "@/lib/notifications";
import { useNotificationStore } from "@/stores/notifications";

const STORAGE_KEY = "language_v1_preference";

export type LanguagePreference = "system" | AppLanguage;

const SUPPORTED_CODES: readonly string[] = SUPPORTED_LANGUAGES.map((l) => l.code);

/**
 * Murni & teruji: preferensi eksplisit menang; "system" dicocokkan terhadap
 * SUPPORTED_LANGUAGES (bukan hardcode 'id'/'en'), fallback SYSTEM_FALLBACK_LANGUAGE
 * jika bahasa device tidak didukung (mis. device Jepang, kita baru dukung id/en).
 */
export function resolveLanguage(
  preference: LanguagePreference,
  deviceLanguageCode?: string | null,
): AppLanguage {
  if (preference !== "system") return preference;
  if (deviceLanguageCode && SUPPORTED_CODES.includes(deviceLanguageCode)) {
    return deviceLanguageCode as AppLanguage;
  }
  return SYSTEM_FALLBACK_LANGUAGE;
}

function deviceLanguageCode(): string | null {
  return getLocales()[0]?.languageCode ?? null;
}

function isLanguagePreference(value: string): value is LanguagePreference {
  return value === "system" || SUPPORTED_CODES.includes(value);
}

interface LanguageState {
  preference: LanguagePreference;
  initialized: boolean;
  /** Baca preferensi tersimpan & terapkan ke i18n. Dipanggil sekali di app/_layout.tsx. */
  initialize: () => Promise<void>;
  setPreference: (pref: LanguagePreference) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  preference: "system",
  initialized: false,

  initialize: async () => {
    let preference: LanguagePreference = "system";
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && isLanguagePreference(stored)) preference = stored;
    } catch {
      // Storage tak terbaca → tetap "system", bukan error fatal.
    }
    await i18n.changeLanguage(resolveLanguage(preference, deviceLanguageCode()));
    set({ preference, initialized: true });
  },

  setPreference: async (pref) => {
    await AsyncStorage.setItem(STORAGE_KEY, pref);
    await i18n.changeLanguage(resolveLanguage(pref, deviceLanguageCode()));
    set({ preference: pref });

    // Copy notifikasi di-bake saat penjadwalan → jadwalkan ulang dengan bahasa baru.
    const notif = useNotificationStore.getState();
    if (notif.dailyReminderEnabled) {
      await scheduleDailyReminder(notif.dailyReminderHour, notif.dailyReminderMinute);
    }
  },
}));
