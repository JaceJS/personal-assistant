import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { SITE_DESCRIPTION_EN, SITE_NAME, SITE_URL } from "@/lib/site";

import "../globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}: Track Expenses as Fast as You Chat`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION_EN,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    alternateLocale: "id_ID",
    url: `${SITE_URL}/en`,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
