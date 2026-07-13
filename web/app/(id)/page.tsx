import type { Metadata } from "next";

import { Landing } from "@/components/landing";
import { LANDING_ID } from "@/lib/landing-content";
import { languageAlternates, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/", languages: languageAlternates("/") },
};

export default function LandingPage() {
  return <Landing locale="id" description={SITE_DESCRIPTION} content={LANDING_ID} />;
}
