import type { Metadata } from "next";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { PLAY_STORE_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FAQ_ITEMS = [
  {
    question: "Savyn gratis?",
    answer:
      "Ya, semua fitur di versi saat ini gratis, termasuk chat AI, input suara, dan scan struk.",
  },
  {
    question: "Harus daftar akun dulu?",
    answer:
      "Tidak. Kamu bisa langsung mencatat tanpa akun sama sekali, datanya tersimpan lokal di HP kamu. " +
      "Login Google baru diperlukan kalau kamu mau backup ke cloud dan memakai fitur AI.",
  },
  {
    question: "Apakah Savyn terhubung ke rekening bank atau e-wallet?",
    answer:
      "Tidak, dan ini pilihan desain yang disengaja. Savyn tidak pernah meminta akses ke rekening, " +
      "e-wallet, atau SMS kamu. Semua data berasal dari yang kamu catat sendiri, jadi kamu pegang " +
      "kendali penuh.",
  },
  {
    question: "Data keuanganku aman di mana?",
    answer:
      "Mode tanpa akun: data hanya ada di HP kamu. Mode akun: data tersimpan terenkripsi saat " +
      "transit di server kami, tidak dijual ke siapa pun, tanpa iklan, dan kamu bisa hapus akun " +
      "beserta seluruh datanya kapan saja dari dalam aplikasi.",
  },
  {
    question: "Seakurat apa pencatatan lewat AI?",
    answer:
      "AI mengubah chat, suara, atau foto struk jadi draft transaksi. Setiap draft selalu kamu " +
      "review dan konfirmasi dulu sebelum tersimpan, jadi angka yang masuk catatan tetap angka " +
      "yang kamu setujui.",
  },
];

const CHANNELS = [
  {
    icon: "💬",
    title: "Chat AI",
    description:
      "Ketik seperti chat ke teman. Satu kalimat berisi beberapa pengeluaran langsung jadi " +
      "beberapa draft sekaligus. Bisa juga tanya kondisi keuanganmu.",
    sample: '"sate 20rb parkir 2rb" → 2 draft transaksi',
  },
  {
    icon: "🎙️",
    title: "Suara",
    description:
      "Ucapkan transaksimu, termasuk bahasa sehari-hari seperti gocap atau ceban. Kamu review " +
      "transkripnya dulu sebelum jadi catatan.",
    sample: '"tadi makan siang 25 ribu"',
  },
  {
    icon: "📷",
    title: "Scan struk",
    description:
      "Foto struk belanjaan, AI membaca isinya dan menyiapkan draft transaksi untuk kamu konfirmasi.",
    sample: "struk supermarket → draft otomatis",
  },
  {
    icon: "⚡",
    title: "Input manual",
    description:
      "Form super ringkas untuk situasi apa pun: kategori opsional, angka langsung siap diketik. " +
      "Selesai dalam hitungan detik.",
    sample: "buka → ketik angka → simpan",
  },
];

const PROACTIVE_FEATURES = [
  {
    title: "Budget alert 80% dan 100%",
    description:
      "Savyn memberi tahu saat pengeluaranmu mendekati atau melewati budget, per kategori maupun bulanan.",
  },
  {
    title: "Pengingat harian",
    description:
      "Satu notifikasi ringan di jam yang kamu pilih, supaya mencatat jadi kebiasaan, bukan beban.",
  },
  {
    title: "Ringkasan mingguan",
    description: "Pemasukan, pengeluaran, dan selisih minggu ini tersaji tanpa perlu dihitung manual.",
  },
  {
    title: "AI insight harian",
    description:
      "Satu kalimat pengamatan dari datamu sendiri. Savyn menunjukkan datanya, kesimpulannya tetap milikmu.",
  },
];

/** JSON-LD: MobileApplication + FAQPage untuk rich results. */
function buildJsonLd(): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MobileApplication",
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        operatingSystem: "Android",
        applicationCategory: "FinanceApplication",
        url: SITE_URL,
        installUrl: PLAY_STORE_URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
        inLanguage: "id",
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

export default function LandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildJsonLd() }} />
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="container">
            <div>
              <p className="hero-eyebrow">Pencatat keuangan AI · Gratis di Android</p>
              <h1>
                Catat pengeluaran <em>secepat kamu ngetik chat</em>
              </h1>
              <p className="hero-sub">
                Savyn mengubah &ldquo;sate 20rb parkir 2rb&rdquo; jadi catatan transaksi yang rapi.
                Ketik, ucapkan, atau foto struknya, AI yang membereskan sisanya. Kamu tinggal
                konfirmasi.
              </p>
              <div className="hero-ctas">
                <a className="btn btn-primary" href={PLAY_STORE_URL}>
                  Download di Google Play
                </a>
                <p className="hero-note">Gratis. Bisa dipakai tanpa daftar akun.</p>
              </div>
            </div>
            <div className="phone" aria-hidden="true">
              <p className="phone-title">Chat AI Savyn</p>
              <div className="chat-flow">
                <p className="bubble-user">sate 20rb parkir 2rb</p>
                <div className="draft-card">
                  <p className="label">
                    Sate
                    <span className="category">Makan &amp; Minum · konfirmasi?</span>
                  </p>
                  <p className="amount">-Rp 20.000</p>
                </div>
                <div className="draft-card">
                  <p className="label">
                    Parkir
                    <span className="category">Transport · konfirmasi?</span>
                  </p>
                  <p className="amount">-Rp 2.000</p>
                </div>
              </div>
              <p className="chat-caption">Satu kalimat, dua transaksi. Kamu yang konfirmasi.</p>
            </div>
          </div>
        </section>

        <section className="manifesto">
          <div className="container">
            <p>
              Aplikasi keuangan gagal bukan karena kurang fitur. Gagal karena{" "}
              <strong>mencatat itu ribet</strong>. Savyn memangkas ribetnya di setiap situasi:
              di kasir, di jalan, atau di rumah.
            </p>
          </div>
        </section>

        <section className="section" id="kanal">
          <div className="container">
            <p className="section-eyebrow">Empat cara mencatat</p>
            <h2>Kanal tercepat untuk tiap situasi</h2>
            <p className="section-lede">
              Lagi di tempat umum? Ketik chat. Sendirian di rumah? Tinggal ngomong. Ada struk?
              Foto saja. Semuanya berakhir jadi satu catatan yang sama rapinya.
            </p>
            <div className="channel-grid">
              {CHANNELS.map((channel) => (
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
            <p className="section-eyebrow">Bukan sekadar pencatat</p>
            <h2>Asisten yang mengingatkan, bukan menghakimi</h2>
            <p className="section-lede">
              Setelah tercatat, Savyn yang memantau. Tanpa nada menyalahkan: datanya
              ditunjukkan apa adanya, keputusan tetap di tangan kamu.
            </p>
            <ul className="proactive-list">
              {PROACTIVE_FEATURES.map((feature) => (
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
            <p className="section-eyebrow">Privasi &amp; kendali</p>
            <h2>Data keuanganmu, aturanmu</h2>
            <ul className="privacy-points">
              <li>
                <strong>Bisa dipakai tanpa akun</strong>
                <span>Mode tamu menyimpan semua data hanya di HP kamu, bukan di server.</span>
              </li>
              <li>
                <strong>Tidak terhubung ke bank</strong>
                <span>
                  Savyn tidak pernah meminta akses rekening, e-wallet, atau SMS. Semua data dari
                  input kamu sendiri.
                </span>
              </li>
              <li>
                <strong>Tanpa iklan, tanpa jual data</strong>
                <span>Datamu dipakai untuk satu hal: menampilkan catatan keuanganmu sendiri.</span>
              </li>
              <li>
                <strong>Hapus kapan saja</strong>
                <span>
                  Hapus akun permanen tersedia di dalam aplikasi, seluruh data ikut terhapus.
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="container">
            <p className="section-eyebrow">FAQ</p>
            <h2>Pertanyaan yang sering muncul</h2>
            <div className="faq-list">
              {FAQ_ITEMS.map((item) => (
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
            <h2>Mulai dari transaksi berikutnya</h2>
            <p>Tidak perlu daftar. Buka aplikasinya, catat, selesai.</p>
            <a className="btn btn-primary" href={PLAY_STORE_URL}>
              Download di Google Play
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
