import Link from "next/link";

import { DEVELOPER_NAME, PLAY_STORE_URL, SUPPORT_EMAIL } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="wordmark">
          Savyn<span>.</span>
        </Link>
        <a className="btn btn-primary btn-header" href={PLAY_STORE_URL}>
          Download di Google Play
        </a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <p>
          © {new Date().getFullYear()} {DEVELOPER_NAME}
        </p>
        <nav aria-label="Tautan legal">
          <Link href="/privacy">Kebijakan Privasi</Link>
          <Link href="/terms">Syarat &amp; Ketentuan</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>Kontak</a>
        </nav>
      </div>
    </footer>
  );
}
