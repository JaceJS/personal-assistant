import Image from "next/image";
import Link from "next/link";

import logoMark from "@/public/web-app-manifest-192x192.png";
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
    download: "Download",
    menu: [
      { href: "#tentang", label: "Tentang" },
      { href: "#kanal", label: "Fitur" },
      { href: "#asisten", label: "Asisten" },
      { href: "#privasi", label: "Privasi" },
      { href: "#faq", label: "FAQ" },
    ],
    menuNav: "Menu utama",
    langNav: "Pilih bahasa",
    legalNav: "Tautan legal",
    privacy: "Kebijakan Privasi",
    terms: "Syarat & Ketentuan",
    contact: "Kontak",
  },
  en: {
    download: "Download",
    menu: [
      { href: "#tentang", label: "About" },
      { href: "#kanal", label: "Features" },
      { href: "#asisten", label: "Assistant" },
      { href: "#privasi", label: "Privacy" },
      { href: "#faq", label: "FAQ" },
    ],
    menuNav: "Main menu",
    langNav: "Choose language",
    legalNav: "Legal links",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    contact: "Contact",
  },
} as const;

const LANGUAGES: { locale: Locale; label: string }[] = [
  { locale: "id", label: "Bahasa Indonesia" },
  { locale: "en", label: "English" },
];

export function SiteHeader({ locale, page }: { locale: Locale; page: SitePage }) {
  const t = CHROME[locale];
  const home = localePath(locale, "/");
  return (
    <header className="site-header">
      <div className="container">
        <Link href={`${home}#top`} className="wordmark">
          <Image src={logoMark} alt="" width={28} height={28} className="wordmark-icon" priority />
          Savyn
        </Link>
        <nav className="site-nav" aria-label={t.menuNav}>
          {t.menu.map((item) => (
            <Link key={item.href} href={`${home}${item.href}`}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <a className="btn btn-primary btn-header" href={PLAY_STORE_URL}>
            {t.download}
          </a>
          <details className="lang-dropdown">
            <summary aria-label={t.langNav}>{locale.toUpperCase()}</summary>
            <nav className="lang-menu" aria-label={t.langNav}>
              {LANGUAGES.map((lang) => (
                <Link
                  key={lang.locale}
                  href={localePath(lang.locale, page)}
                  hrefLang={lang.locale}
                  aria-current={lang.locale === locale ? "true" : undefined}
                >
                  {lang.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = CHROME[locale];
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-brand">
          <Image src={logoMark} alt="" width={20} height={20} className="wordmark-icon" />
          <p>
            © {new Date().getFullYear()} {DEVELOPER_NAME}
          </p>
        </div>
        <nav aria-label={t.legalNav}>
          <Link href={localePath(locale, "/privacy")}>{t.privacy}</Link>
          <Link href={localePath(locale, "/terms")}>{t.terms}</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{t.contact}</a>
        </nav>
      </div>
    </footer>
  );
}
