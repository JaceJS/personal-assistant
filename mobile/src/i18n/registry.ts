import { enUS, id as dateFnsId } from "date-fns/locale";

import en from "./locales/en.json";
import id from "./locales/id.json";

/**
 * Satu sumber kebenaran untuk bahasa yang didukung. Menambah bahasa baru =
 * 1) buat `locales/xx.json` (copy en.json, terjemahkan), 2) cari locale
 * date-fns yang sesuai (https://date-fns.org/docs/I18n), 3) tambah satu baris
 * di sini. index.ts, switcher Settings, dan DatePicker mengikuti otomatis
 * (semua `.map()`/lookup atas array ini) — tidak ada file lain yang disentuh.
 */
export const SUPPORTED_LANGUAGES = [
  {
    code: "id",
    nativeName: "Bahasa Indonesia",
    bcp47: "id-ID",
    dateFnsLocale: dateFnsId,
    groupingSeparator: ".",
    resource: id,
  },
  {
    code: "en",
    nativeName: "English",
    bcp47: "en-US",
    dateFnsLocale: enUS,
    groupingSeparator: ",",
    resource: en,
  },
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** Bahasa awal i18next sebelum language store hydrate, dan fallback untuk key yang hilang. */
export const DEFAULT_LANGUAGE: AppLanguage = "id";

/**
 * Target "Ikuti Sistem" saat bahasa device TIDAK ada di SUPPORTED_LANGUAGES
 * (mis. device berbahasa Jepang, kita baru dukung id/en). Keputusan produk:
 * device Indonesia → id, device lainnya → en — bukan selalu jatuh ke id.
 */
export const SYSTEM_FALLBACK_LANGUAGE: AppLanguage = "en";
