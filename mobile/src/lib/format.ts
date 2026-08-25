import i18n from "@/i18n";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/i18n/registry";

const BCP47_BY_CODE: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((lang) => [lang.code, lang.bcp47])
);
const DEFAULT_BCP47 = BCP47_BY_CODE[DEFAULT_LANGUAGE];

/** BCP-47 locale untuk Intl, diturunkan dari bahasa UI aktif via registry. */
export function activeLocale(): string {
  return BCP47_BY_CODE[i18n.language] ?? DEFAULT_BCP47;
}

/**
 * Format uang mengikuti locale bahasa UI. Currency-agnostic: kode mata uang
 * adalah parameter (default IDR selama app masih single-currency).
 */
export function formatMoney(amount: number, currency: string = "IDR"): string {
  return new Intl.NumberFormat(activeLocale(), {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat(activeLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatShortDate(date: string | Date): string {
  return new Intl.DateTimeFormat(activeLocale(), {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat(activeLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/** Nama 12 bulan dalam bahasa UI aktif (pengganti array MONTH_NAMES lokal). */
export function getMonthNames(style: "long" | "short" = "long"): string[] {
  const fmt = new Intl.DateTimeFormat(activeLocale(), { month: style });
  return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(2024, m, 1)));
}

/** Nama hari Senin..Minggu dalam bahasa UI aktif (2024-01-01 = Senin). */
export function getWeekdayNames(style: "narrow" | "short" = "narrow"): string[] {
  const fmt = new Intl.DateTimeFormat(activeLocale(), { weekday: style });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
}

/** Objek Locale date-fns yang cocok dengan bahasa UI aktif (untuk format()/dsb dari date-fns). */
export function activeDateFnsLocale() {
  return (
    SUPPORTED_LANGUAGES.find((lang) => lang.code === i18n.language)?.dateFnsLocale ??
    SUPPORTED_LANGUAGES.find((lang) => lang.code === DEFAULT_LANGUAGE)!.dateFnsLocale
  );
}

export function toYmd(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Label grup tanggal riwayat: "Hari ini - Senin, 13 Juli 2026" / tanggal penuh. */
export function formatDateLabel(dateStr: string): string {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  const [year, month, day] = dateStr.split("-").map(Number);
  const fullDate = new Intl.DateTimeFormat(activeLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));

  if (dateStr === toYmd(now)) return `${i18n.t("common.today")} - ${fullDate}`;
  if (dateStr === toYmd(yesterday)) return `${i18n.t("common.yesterday")} - ${fullDate}`;
  return fullDate;
}

const RECENT_DAY_WINDOW = 7;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Pemisah tanggal chat ala WhatsApp: "Hari ini"/"Kemarin"/nama hari untuk
 * <1 minggu, tanggal penuh setelahnya. Dibanding per hari kalender, bukan
 * jendela 24 jam, jadi jam 00:05 tetap terhitung "hari ini". */
export function formatChatDaySeparator(date: Date): string {
  const diffDays = Math.round(
    (startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / 86_400_000
  );
  if (diffDays === 0) return i18n.t("common.today");
  if (diffDays === 1) return i18n.t("common.yesterday");
  if (diffDays < RECENT_DAY_WINDOW) {
    return new Intl.DateTimeFormat(activeLocale(), { weekday: "long" }).format(date);
  }
  return formatDate(date);
}

/** Compact axis label for money charts: 1_500_000 → "1.5jt"/"1.5M", 2_000 → "2k". */
export function formatChartAxisValue(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}${i18n.t("charts.millionSuffix")}`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
  return String(Math.round(val));
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return i18n.t("common.justNow");
  if (mins < 60) return i18n.t("common.minutesAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return i18n.t("common.hoursAgo", { count: hours });
  return i18n.t("common.daysAgo", { count: Math.floor(hours / 24) });
}
