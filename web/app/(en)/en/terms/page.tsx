import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import {
  DEVELOPER_NAME,
  languageAlternates,
  LEGAL_EFFECTIVE_DATE_EN,
  SUPPORT_EMAIL,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Savyn Terms of Service: scope of the service, responsibilities, and your rights.",
  alternates: { canonical: "/en/terms", languages: languageAlternates("/terms") },
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader locale="en" page="/terms" />
      <main className="legal">
        <div className="container">
          <article>
            <h1>Savyn Terms of Service</h1>
            <p className="effective">Effective as of {LEGAL_EFFECTIVE_DATE_EN}</p>

            <p>
              These terms govern the use of the Savyn application (the &ldquo;App&rdquo;)
              developed by {DEVELOPER_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By using the
              App, you agree to the terms below. How we handle your data is covered separately
              in the <Link href="/en/privacy">Privacy Policy</Link>.
            </p>

            <h2>1. Eligibility</h2>
            <div className="summary-box">at least 13 years old; under 18 needs parental consent.</div>
            <p>
              You must be at least 13 years old to use the App. If you are under 18, you confirm
              that you have your parent&rsquo;s or guardian&rsquo;s consent.
            </p>

            <h2>2. Description of the service</h2>
            <div className="summary-box">
              Savyn is a personal finance logging tool. All data comes from your own input.
            </div>
            <p>
              Savyn is an AI-assisted personal finance logging and visualization app: manual
              entry, voice, chat, and receipt scanning. Savyn does not connect to bank accounts
              or e-wallets, does not process payments, and is not a financial services provider.
              The current version of the App is free.
            </p>

            <h2>3. AI output is a draft</h2>
            <div className="summary-box">
              AI can misread. Every AI result must be confirmed by you first, and you are
              responsible for the accuracy of the final data.
            </div>
            <p>
              The voice, chat, and receipt-scan features use AI models that can misread or
              incorrectly extract information. AI output is always a draft that you must review
              and confirm before it is saved as a transaction. You are responsible for
              verifying the accuracy of your own financial data.
            </p>

            <h2>4. Not financial advice</h2>
            <p>
              Insights, summaries, and AI assistant answers are informational, based on the data
              you enter, and do not constitute financial, investment, tax, or legal advice.
              Financial decisions are entirely your responsibility.
            </p>

            <h2>5. Accounts and guest mode</h2>
            <ul>
              <li>
                Sign-in uses your Google account. You are responsible for keeping access to your
                Google account secure.
              </li>
              <li>
                In guest mode, all data is stored locally on your device. Losing the device,
                uninstalling the app, or device failure without a backup means that data is lost
                and we cannot recover it.
              </li>
            </ul>

            <h2>6. Prohibited use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>decompile, modify, or reverse engineer the App;</li>
              <li>
                access the service through automation, abuse the API, or attempt to bypass rate
                limits;
              </li>
              <li>disrupt the operation of the service or the security of other users;</li>
              <li>use the App for unlawful activity.</li>
            </ul>

            <h2>7. Fair use limits</h2>
            <p>
              AI features are subject to hourly usage quotas to keep the service sustainable. We
              may adjust these limits from time to time.
            </p>

            <h2>8. Intellectual property</h2>
            <p>
              The App, its brand, and all of its materials belong to {DEVELOPER_NAME}. The
              financial data you enter remains yours.
            </p>

            <h2>9. Account deletion and suspension</h2>
            <p>
              You can permanently delete your account from inside the App at any time (Profile
              &gt; Delete Account). We may suspend or terminate accounts that violate these
              terms, with reasonable notice where possible.
            </p>

            <h2>10. Changes to the service and these terms</h2>
            <p>
              App features may change, expand, or be discontinued. These terms may also be
              updated; material changes will be announced through the App or this page with an
              updated effective date. Continued use after a change means you accept the new
              terms.
            </p>

            <h2>11. Limitation of liability</h2>
            <div className="summary-box">
              the service is provided as is; we are not liable for financial decisions you make
              based on data in the App.
            </div>
            <p>
              The App is provided &ldquo;as is&rdquo; without warranty of any kind. To the
              extent permitted by applicable law, we are not liable for losses arising from data
              inaccuracies, your financial decisions, data loss in guest mode, or service
              interruptions. Some jurisdictions do not allow certain limitations, so parts of
              the above may not apply to you.
            </p>

            <h2>12. Governing law</h2>
            <p>
              These terms are governed by the laws of the Republic of Indonesia. Disputes will
              first be pursued through amicable settlement; failing that, resolution will go
              through the competent courts of Indonesia.
            </p>

            <h2>13. Contact</h2>
            <p>
              {DEVELOPER_NAME}
              <br />
              Email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
          </article>
        </div>
      </main>
      <SiteFooter locale="en" />
    </>
  );
}
