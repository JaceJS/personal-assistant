import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import type { LandingContent } from "@/lib/landing-content";
import {
  localePath,
  PLAY_STORE_URL,
  SITE_NAME,
  SITE_URL,
  type Locale,
} from "@/lib/site";

/** JSON-LD: MobileApplication + FAQPage untuk rich results. */
function buildJsonLd(locale: Locale, description: string, content: LandingContent): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MobileApplication",
        name: SITE_NAME,
        description,
        operatingSystem: "Android",
        applicationCategory: "FinanceApplication",
        url: `${SITE_URL}${localePath(locale, "/")}`,
        installUrl: PLAY_STORE_URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
        inLanguage: locale,
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

export function Landing({
  locale,
  description,
  content,
}: {
  locale: Locale;
  description: string;
  content: LandingContent;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildJsonLd(locale, description, content) }}
      />
      <SiteHeader locale={locale} page="/" />
      <main>
        <section className="hero">
          <div className="container">
            <div>
              <p className="hero-eyebrow">{content.heroEyebrow}</p>
              <h1>
                {content.heroTitleLead}
                <em>{content.heroTitleEm}</em>
              </h1>
              <p className="hero-sub">{content.heroSub}</p>
              <div className="hero-ctas">
                <a className="btn btn-primary" href={PLAY_STORE_URL}>
                  {content.ctaDownload}
                </a>
                <p className="hero-note">{content.heroNote}</p>
              </div>
            </div>
            <div className="phone" aria-hidden="true">
              <p className="phone-title">{content.phoneTitle}</p>
              <div className="chat-flow">
                <p className="bubble-user">{content.phoneBubble}</p>
                {content.phoneDrafts.map((draft) => (
                  <div className="draft-card" key={draft.label}>
                    <p className="label">
                      {draft.label}
                      <span className="category">{draft.category}</span>
                    </p>
                    <p className="amount">{draft.amount}</p>
                  </div>
                ))}
              </div>
              <p className="chat-caption">{content.phoneCaption}</p>
            </div>
          </div>
        </section>

        <section className="manifesto">
          <div className="container">
            <p>
              {content.manifestoLead}
              <strong>{content.manifestoStrong}</strong>
              {content.manifestoTail}
            </p>
          </div>
        </section>

        <section className="section" id="kanal">
          <div className="container">
            <p className="section-eyebrow">{content.channelsEyebrow}</p>
            <h2>{content.channelsTitle}</h2>
            <p className="section-lede">{content.channelsLede}</p>
            <div className="channel-grid">
              {content.channels.map((channel) => (
                <div className="channel-card" key={channel.title}>
                  <span className="icon" aria-hidden="true">
                    {channel.icon}
                  </span>
                  <h3>{channel.title}</h3>
                  <p>{channel.description}</p>
                  <span className="sample mono">{channel.sample}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr className="tear" />

        <section className="section" id="asisten">
          <div className="container">
            <p className="section-eyebrow">{content.assistantEyebrow}</p>
            <h2>{content.assistantTitle}</h2>
            <p className="section-lede">{content.assistantLede}</p>
            <ul className="proactive-list">
              {content.proactiveFeatures.map((feature) => (
                <li key={feature.title}>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section privacy" id="privasi">
          <div className="container">
            <p className="section-eyebrow">{content.privacyEyebrow}</p>
            <h2>{content.privacyTitle}</h2>
            <ul className="privacy-points">
              {content.privacyPoints.map((point) => (
                <li key={point.title}>
                  <strong>{point.title}</strong>
                  <span>{point.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="container">
            <p className="section-eyebrow">{content.faqEyebrow}</p>
            <h2>{content.faqTitle}</h2>
            <div className="faq-list">
              {content.faqItems.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <hr className="tear" />

        <section className="cta-final">
          <div className="container">
            <h2>{content.ctaFinalTitle}</h2>
            <p>{content.ctaFinalSub}</p>
            <a className="btn btn-primary" href={PLAY_STORE_URL}>
              {content.ctaDownload}
            </a>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
