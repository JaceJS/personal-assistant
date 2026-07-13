import type { Metadata } from "next";

import { Landing } from "@/components/landing";
import { LANDING_EN } from "@/lib/landing-content";
import { languageAlternates, SITE_DESCRIPTION_EN } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/en", languages: languageAlternates("/") },
};

export default function LandingPage() {
  return <Landing locale="en" description={SITE_DESCRIPTION_EN} content={LANDING_EN} />;
}
