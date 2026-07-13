/**
 * Single source of truth for site-wide facts.
 * Update here (and only here) when the domain, contact, or store listing changes.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.savyn.id";

export const SITE_NAME = "Savyn";

export const SITE_DESCRIPTION =
  "Savyn adalah aplikasi pencatat keuangan berbasis AI. Catat pengeluaran lewat chat, " +
  "suara, foto struk, atau input manual dalam hitungan detik. Gratis, bisa dipakai tanpa akun.";

export const SITE_DESCRIPTION_EN =
  "Savyn is an AI-powered expense tracker. Log spending through chat, voice, receipt " +
  "photos, or quick manual entry in seconds. Free, no account required.";

export const DEVELOPER_NAME = "Savyn";

export const SUPPORT_EMAIL = "jonathansalendah.work@gmail.com";

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.salendah_labs.savyn";

/** Tanggal berlaku dokumen legal (privacy & terms). */
export const LEGAL_EFFECTIVE_DATE = "11 Juli 2026";
export const LEGAL_EFFECTIVE_DATE_EN = "July 11, 2026";

export type Locale = "id" | "en";

/** Prefix a site path with the locale segment (`id` stays unprefixed). */
export function localePath(locale: Locale, path: "/" | "/privacy" | "/terms"): string {
  if (locale === "id") return path;
  return path === "/" ? "/en" : `/en${path}`;
}

/** hreflang map for a page pair; Indonesian is the x-default. */
export function languageAlternates(path: "/" | "/privacy" | "/terms") {
  return {
    id: localePath("id", path),
    en: localePath("en", path),
    "x-default": localePath("id", path),
  };
}
