import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import {
  DEVELOPER_NAME,
  languageAlternates,
  LEGAL_EFFECTIVE_DATE,
  SUPPORT_EMAIL,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Syarat & Ketentuan penggunaan aplikasi Savyn: cakupan layanan, tanggung jawab, dan hak Anda.",
  alternates: { canonical: "/terms", languages: languageAlternates("/terms") },
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader locale="id" page="/terms" />
      <main className="legal">
        <div className="container">
          <article>
            <h1>Syarat &amp; Ketentuan Savyn</h1>
            <p className="effective">Berlaku sejak {LEGAL_EFFECTIVE_DATE}</p>

            <p>
              Dokumen ini mengatur penggunaan aplikasi Savyn (&ldquo;Aplikasi&rdquo;) yang
              dikembangkan oleh {DEVELOPER_NAME} (&ldquo;kami&rdquo;). Dengan memakai Aplikasi,
              Anda menyetujui syarat di bawah ini. Cara kami menangani data Anda diatur terpisah
              dalam <Link href="/privacy">Kebijakan Privasi</Link>.
            </p>

            <h2>1. Kelayakan</h2>
            <div className="summary-box">minimal 13 tahun; di bawah 18 perlu izin orang tua.</div>
            <p>
              Anda harus berusia minimal 13 tahun untuk memakai Aplikasi. Jika Anda berusia di
              bawah 18 tahun, Anda menyatakan telah mendapat persetujuan orang tua atau wali.
            </p>

            <h2>2. Deskripsi layanan</h2>
            <div className="summary-box">
              Savyn adalah alat pencatatan keuangan pribadi. Semua data berasal dari input Anda.
            </div>
            <p>
              Savyn adalah aplikasi pencatatan dan visualisasi keuangan pribadi dengan bantuan
              AI: input manual, suara, chat, dan scan struk. Savyn tidak terhubung ke rekening
              bank atau e-wallet, tidak memproses pembayaran, dan bukan penyedia jasa keuangan.
              Aplikasi ini gratis pada versi saat ini.
            </p>

            <h2>3. Hasil AI adalah draft</h2>
            <div className="summary-box">
              AI bisa salah baca. Setiap hasil AI harus Anda konfirmasi dulu, dan Anda yang
              bertanggung jawab atas kebenaran data akhir.
            </div>
            <p>
              Fitur suara, chat, dan scan struk menggunakan model AI yang dapat salah membaca
              atau salah mengekstrak informasi. Hasil AI selalu berupa draft yang harus Anda
              tinjau dan konfirmasi sebelum tersimpan sebagai transaksi. Anda bertanggung jawab
              memverifikasi kebenaran data keuangan Anda sendiri.
            </p>

            <h2>4. Bukan nasihat keuangan</h2>
            <p>
              Insight, ringkasan, dan jawaban asisten AI bersifat informatif berdasarkan data
              yang Anda input, dan bukan merupakan nasihat keuangan, investasi, pajak, atau
              hukum. Keputusan finansial sepenuhnya menjadi tanggung jawab Anda.
            </p>

            <h2>5. Akun dan mode tamu</h2>
            <ul>
              <li>
                Masuk menggunakan akun Google. Anda bertanggung jawab menjaga keamanan akses ke
                akun Google Anda.
              </li>
              <li>
                Dalam mode tamu, seluruh data tersimpan lokal di perangkat Anda. Kehilangan
                perangkat, penghapusan aplikasi, atau kerusakan perangkat tanpa backup berarti
                data tersebut hilang dan tidak dapat kami pulihkan.
              </li>
            </ul>

            <h2>6. Penggunaan yang dilarang</h2>
            <p>Anda setuju untuk tidak:</p>
            <ul>
              <li>membongkar, memodifikasi, atau merekayasa balik Aplikasi;</li>
              <li>
                mengakses layanan secara otomatis, menyalahgunakan API, atau berupaya melewati
                pembatasan laju permintaan;
              </li>
              <li>mengganggu operasional layanan atau keamanan pengguna lain;</li>
              <li>memakai Aplikasi untuk aktivitas yang melanggar hukum.</li>
            </ul>

            <h2>7. Batas penggunaan wajar</h2>
            <p>
              Fitur AI dibatasi kuota penggunaan per jam untuk menjaga keberlangsungan layanan.
              Batas ini dapat kami sesuaikan dari waktu ke waktu.
            </p>

            <h2>8. Kekayaan intelektual</h2>
            <p>
              Aplikasi, merek, dan seluruh materinya adalah milik {DEVELOPER_NAME}. Data keuangan
              yang Anda input tetap milik Anda.
            </p>

            <h2>9. Penghapusan dan penangguhan akun</h2>
            <p>
              Anda dapat menghapus akun secara permanen dari dalam Aplikasi kapan saja (Profil
              &gt; Hapus Akun). Kami dapat menangguhkan atau menghentikan akun yang melanggar
              syarat ini, dengan pemberitahuan yang wajar bila memungkinkan.
            </p>

            <h2>10. Perubahan layanan dan syarat</h2>
            <p>
              Fitur Aplikasi dapat berubah, bertambah, atau dihentikan. Syarat ini juga dapat
              diperbarui; perubahan material akan diumumkan melalui Aplikasi atau halaman ini
              dengan tanggal berlaku yang diperbarui. Penggunaan berkelanjutan setelah perubahan
              berarti Anda menyetujui syarat yang baru.
            </p>

            <h2>11. Batasan tanggung jawab</h2>
            <div className="summary-box">
              layanan diberikan apa adanya; kami tidak bertanggung jawab atas keputusan finansial
              yang Anda ambil berdasarkan data di Aplikasi.
            </div>
            <p>
              Aplikasi disediakan &ldquo;sebagaimana adanya&rdquo; tanpa jaminan dalam bentuk apa
              pun. Sepanjang diizinkan oleh hukum yang berlaku, kami tidak bertanggung jawab atas
              kerugian yang timbul dari ketidakakuratan data, keputusan finansial Anda, kehilangan
              data pada mode tamu, atau gangguan layanan. Beberapa yurisdiksi tidak mengizinkan
              pembatasan tertentu, sehingga sebagian batasan di atas mungkin tidak berlaku bagi
              Anda.
            </p>

            <h2>12. Hukum yang berlaku</h2>
            <p>
              Syarat ini diatur oleh hukum Republik Indonesia. Sengketa diupayakan diselesaikan
              secara musyawarah terlebih dahulu; bila tidak tercapai, penyelesaian dilakukan
              melalui pengadilan yang berwenang di Indonesia.
            </p>

            <h2>13. Kontak</h2>
            <p>
              {DEVELOPER_NAME}
              <br />
              Email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
          </article>
        </div>
      </main>
      <SiteFooter locale="id" />
    </>
  );
}
