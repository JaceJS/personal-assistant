import type { MetadataRoute } from "next";

import { languageAlternates, SITE_URL } from "@/lib/site";

function absoluteAlternates(path: "/" | "/privacy" | "/terms") {
  const relative = languageAlternates(path);
  return {
    languages: Object.fromEntries(
      Object.entries(relative).map(([lang, href]) => [lang, `${SITE_URL}${href}`])
    ),
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1,
      alternates: absoluteAlternates("/"),
    },
    {
      url: `${SITE_URL}/en`,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: absoluteAlternates("/"),
    },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: absoluteAlternates("/privacy"),
    },
    {
      url: `${SITE_URL}/en/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: absoluteAlternates("/privacy"),
    },
    {
      url: `${SITE_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: absoluteAlternates("/terms"),
    },
    {
      url: `${SITE_URL}/en/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: absoluteAlternates("/terms"),
    },
  ];
}
