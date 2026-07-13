import Link from "next/link";

import {
  DEVELOPER_NAME,
  localePath,
  PLAY_STORE_URL,
  SUPPORT_EMAIL,
  type Locale,
} from "@/lib/site";

type SitePage = "/" | "/privacy" | "/terms";

const CHROME = {
  id: {
    download: "Download di Google Play",
    legalNav: "Tautan legal",
    privacy: "Kebijakan Privasi",
    terms: "Syarat & Ketentuan",
    contact: "Kontak",
    switchLabel: "English version",
    switchShort: "EN",
  },
  en: {
    download: "Get it on Google Play",
    legalNav: "Legal links",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    contact: "Contact",
    switchLabel: "Versi Bahasa Indonesia",
    switchShort: "ID",
  },
} as const;

const OTHER_LOCALE: Record<Locale, Locale> = { id: "en", en: "id" };

export function SiteHeader({ locale, page }: { locale: Locale; page: SitePage }) {
  const t = CHROME[locale];
  const other = OTHER_LOCALE[locale];
  return (
    <header className="site-header">
      <div className="container">
        <Link href={localePath(locale, "/")} className="wordmark">
          Savyn<span>.</span>
        </Link>
        <nav className="header-actions" aria-label="Header">
          <Link
            href={localePath(other, page)}
            className="lang-switch"
            hrefLang={other}
            aria-label={t.switchLabel}
            title={t.switchLabel}
          >
            {t.switchShort}
          </Link>
          <a className="btn btn-primary btn-header" href={PLAY_STORE_URL}>
            {t.download}
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = CHROME[locale];
  return (
    <footer className="site-footer">
      <div className="container">
        <p>
          © {new Date().getFullYear()} {DEVELOPER_NAME}
        </p>
        <nav aria-label={t.legalNav}>
          <Link href={localePath(locale, "/privacy")}>{t.privacy}</Link>
          <Link href={localePath(locale, "/terms")}>{t.terms}</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{t.contact}</a>
        </nav>
      </div>
    </footer>
  );
}
