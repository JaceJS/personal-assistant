import type { Metadata } from "next";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import {
  DEVELOPER_NAME,
  languageAlternates,
  LEGAL_EFFECTIVE_DATE_EN,
  SUPPORT_EMAIL,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Savyn Privacy Policy: what data is collected, how it is used, and the control you have over it.",
  alternates: { canonical: "/en/privacy", languages: languageAlternates("/privacy") },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader locale="en" page="/privacy" />
      <main className="legal">
        <div className="container">
          <article>
            <h1>Savyn Privacy Policy</h1>
            <p className="effective">Effective as of {LEGAL_EFFECTIVE_DATE_EN}</p>

            <p>
              This policy explains what data the Savyn application (the &ldquo;App&rdquo;)
              collects, how that data is used, and the control you have over it. Savyn is
              developed by {DEVELOPER_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). Questions can
              be sent to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>

            <h2>1. Two ways to use the App</h2>
            <div className="summary-box">
              without an account, your data lives only on your phone. With an account, data is
              stored on our servers so it can be backed up.
            </div>
            <h3>Guest Mode (no account)</h3>
            <p>
              You can use Savyn without signing up. In this mode all financial data (accounts,
              transactions, categories, budgets, savings goals) is stored only locally on your
              device and is not sent to our servers. The only data still transmitted is
              application crash reports, as described in section 2. AI features (chat, voice,
              receipt scan) are not available in guest mode.
            </p>
            <h3>Account Mode (Google sign-in)</h3>
            <p>
              If you sign in with a Google account, your financial data is stored on our servers
              so it can be backed up and synced, and the AI features become active. When you
              switch from guest mode to account mode, your local data is uploaded to the server;
              we do not delete the local copy.
            </p>

            <h2>2. Data we collect</h2>
            <div className="summary-box">
              only data you provide yourself: basic identity from Google, the financial records
              you enter, and the voice/photos you submit for AI processing. We never access your
              bank accounts, location, contacts, or SMS.
            </div>
            <ul>
              <li>
                <strong>Account data:</strong> email address, name (optional), and profile photo
                (optional, chosen by you from your gallery). Authentication uses Google Sign-In
                managed by Supabase Auth.
              </li>
              <li>
                <strong>Financial data you enter:</strong> financial accounts (name, type,
                balance), transactions (amount, category, merchant, notes, date), budgets, and
                savings goals. Savyn does not connect to bank accounts, e-wallets, or any
                external financial source; all financial data comes from your own input.
              </li>
              <li>
                <strong>Voice recordings:</strong> when you use voice input, the audio is
                uploaded to our servers to be transcribed and extracted by AI models. The audio
                file is deleted from our storage as soon as processing finishes, whether it
                succeeds or fails. The transcript and extraction results are kept as part of
                your logging history.
              </li>
              <li>
                <strong>Receipt photos:</strong> when you use the receipt scan feature, the photo
                is uploaded for extraction by AI models. The photo file is deleted from our
                storage as soon as processing finishes. The extraction results are kept.
              </li>
              <li>
                <strong>AI chat history:</strong> your messages and the assistant&rsquo;s replies
                are stored so conversations can be resumed. You can delete conversation history
                from inside the App.
              </li>
              <li>
                <strong>Crash reports:</strong> if the App encounters an error, a technical
                report is sent automatically through Sentry to help us fix bugs. This also
                applies in guest mode.
              </li>
            </ul>
            <p>
              <strong>What we do not collect:</strong> location, contacts, SMS, call logs, or
              anything on your device beyond what is listed above. The App carries no ads and
              uses no advertising SDKs. The current version also does not use behavioral user
              analytics.
            </p>

            <h2>3. Device permissions and their purpose</h2>
            <ul>
              <li>
                <strong>Microphone:</strong> active only while you hold the record button for
                voice input.
              </li>
              <li>
                <strong>Camera:</strong> used only when you use the receipt scan feature.
              </li>
              <li>
                <strong>Photo gallery:</strong> used only when you pick a profile photo.
              </li>
              <li>
                <strong>Notifications:</strong> the daily reminder is local to your device (not
                a server push) and can be turned off anytime in the App settings.
              </li>
            </ul>

            <h2>4. How data is used</h2>
            <p>Your data is used only to:</p>
            <ul>
              <li>display and manage your own financial records;</li>
              <li>
                process voice, chat, and receipt-photo input into transaction drafts through AI
                models;
              </li>
              <li>provide backup and sync across devices (account mode);</li>
              <li>fix bugs and keep the service secure.</li>
            </ul>
            <p>
              We do not sell your data, do not share it for advertising, and do not use it to
              train AI models.
            </p>

            <h2>5. Third-party processors</h2>
            <div className="summary-box">
              we rely on a number of infrastructure services to run Savyn. They process data on
              our instructions.
            </div>
            <ul>
              <li>
                <strong>Google</strong> (Google Sign-In): account sign-in.
              </li>
              <li>
                <strong>Supabase</strong>: authentication and database storage.
              </li>
              <li>
                <strong>Fly.io</strong>: API servers, located in the Singapore region.
              </li>
              <li>
                <strong>Cloudflare R2</strong>: file storage (profile photos; voice audio and
                receipt photos temporarily during processing).
              </li>
              <li>
                <strong>Upstash</strong>: processing queue infrastructure.
              </li>
              <li>
                <strong>OpenRouter</strong>: AI processing. Voice audio, transcripts, chat
                messages, and receipt images are forwarded to AI model providers to be processed
                and produce the output you requested.
              </li>
              <li>
                <strong>Sentry</strong>: crash report collection.
              </li>
            </ul>
            <p>
              Some processing and storage takes place outside Indonesia (including Singapore).
              We choose providers with industry-standard security and apply reasonable
              safeguards for those transfers.
            </p>

            <h2>6. Security</h2>
            <p>
              We apply encryption in transit (HTTPS/TLS), token-based authentication, encrypted
              session storage on the device, data-ownership checks on every server request, and
              request rate limiting. No system can guarantee absolute security, but we work to
              protect your data to a reasonable standard and keep improving it.
            </p>

            <h2>7. Data retention</h2>
            <ul>
              <li>Account data and financial data are kept for as long as your account is active.</li>
              <li>
                Voice audio and receipt-photo files are deleted from storage as soon as AI
                processing finishes.
              </li>
              <li>Crash reports follow Sentry&rsquo;s retention policy.</li>
              <li>
                After you delete your account, all of your data is permanently removed as
                described in section 8.
              </li>
            </ul>

            <h2>8. Your rights and controls</h2>
            <div className="summary-box">
              you can edit your data, delete chat history, and delete your entire account
              directly from inside the App, no need to contact us.
            </div>
            <ul>
              <li>
                <strong>Permanent account deletion:</strong> available inside the App (Profile
                &gt; Delete Account). This removes all of your financial data, chat history,
                stored files, and your authentication account. The action cannot be undone.
              </li>
              <li>
                <strong>Delete AI chat history</strong> from inside the App.
              </li>
              <li>
                <strong>Correct or change financial data</strong> anytime from inside the App.
              </li>
              <li>
                <strong>Revoke device permissions</strong> (microphone, camera, notifications)
                through your operating system settings.
              </li>
              <li>
                For other requests concerning your personal data, contact{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </li>
            </ul>

            <h2>9. Age restriction</h2>
            <p>
              Savyn is not directed at children under 13, and we do not knowingly collect data
              from them. If you believe a child has provided us with data, contact us so it can
              be deleted.
            </p>

            <h2>10. Changes to this policy</h2>
            <p>
              This policy may be updated from time to time. Material changes will be announced
              through the App or this page, with an updated effective date. Continued use after
              a change means you accept the new policy.
            </p>

            <h2>11. Contact</h2>
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
