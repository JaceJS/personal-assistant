/**
 * Single source of truth for site-wide facts.
 * Update here (and only here) when the domain, contact, or store listing changes.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://savyn-ten.vercel.app";

export const SITE_NAME = "Savyn";

export const SITE_DESCRIPTION =
  "Savyn adalah aplikasi pencatat keuangan berbasis AI. Catat pengeluaran lewat chat, " +
  "suara, foto struk, atau input manual dalam hitungan detik. Gratis, bisa dipakai tanpa akun.";

export const DEVELOPER_NAME = "Salendah Labs";

export const SUPPORT_EMAIL = "jonathansalendah.work@gmail.com";

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.salendah_labs.savyn";

/** Tanggal berlaku dokumen legal (privacy & terms). */
export const LEGAL_EFFECTIVE_DATE = "11 Juli 2026";
