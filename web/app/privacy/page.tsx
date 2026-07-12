import type { Metadata } from "next";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DEVELOPER_NAME, LEGAL_EFFECTIVE_DATE, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Kebijakan Privasi Savyn: data apa yang dikumpulkan, bagaimana dipakai, dan kendali Anda atasnya.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="legal">
        <div className="container">
          <article>
            <h1>Kebijakan Privasi Savyn</h1>
            <p className="effective">Berlaku sejak {LEGAL_EFFECTIVE_DATE}</p>

            <p>
              Kebijakan ini menjelaskan data apa yang dikumpulkan aplikasi Savyn
              (&ldquo;Aplikasi&rdquo;), bagaimana data itu dipakai, dan kendali apa yang Anda
              miliki. Savyn dikembangkan oleh {DEVELOPER_NAME} (&ldquo;kami&rdquo;). Pertanyaan
              apa pun dapat dikirim ke <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>

            <h2>1. Dua mode penggunaan</h2>
            <div className="summary-box">
              tanpa akun, data Anda hanya ada di HP Anda. Dengan akun, data disimpan di server
              kami agar bisa di-backup.
            </div>
            <h3>Mode Tamu (tanpa akun)</h3>
            <p>
              Anda dapat memakai Savyn tanpa mendaftar. Dalam mode ini seluruh data keuangan
              (akun, transaksi, kategori, budget, target tabungan) tersimpan hanya secara lokal
              di perangkat Anda dan tidak dikirim ke server kami. Satu-satunya data yang tetap
              terkirim adalah laporan kerusakan aplikasi (crash report) sebagaimana dijelaskan di
              bagian 2. Fitur AI (chat, suara, scan struk) tidak tersedia di mode tamu.
            </p>
            <h3>Mode Akun (login Google)</h3>
            <p>
              Jika Anda masuk dengan akun Google, data keuangan Anda disimpan di server kami agar
              dapat di-backup dan disinkronkan, dan fitur AI menjadi aktif. Saat Anda beralih dari
              mode tamu ke mode akun, data lokal Anda diunggah ke server; salinan lokalnya tidak
              kami hapus.
            </p>

            <h2>2. Data yang kami kumpulkan</h2>
            <div className="summary-box">
              hanya data yang Anda berikan sendiri: identitas dasar dari Google, catatan keuangan
              yang Anda input, serta suara/foto yang Anda kirim untuk diproses AI. Kami tidak
              mengakses rekening bank, lokasi, kontak, atau SMS Anda.
            </div>
            <ul>
              <li>
                <strong>Data akun:</strong> alamat email, nama (opsional), dan foto profil
                (opsional, Anda pilih sendiri dari galeri). Autentikasi menggunakan Google
                Sign-In yang dikelola oleh Supabase Auth.
              </li>
              <li>
                <strong>Data keuangan yang Anda input:</strong> akun keuangan (nama, tipe,
                saldo), transaksi (jumlah, kategori, merchant, catatan, tanggal), budget, dan
                target tabungan. Savyn tidak terhubung ke rekening bank, e-wallet, atau sumber
                finansial eksternal mana pun; seluruh data keuangan berasal dari input Anda
                sendiri.
              </li>
              <li>
                <strong>Rekaman suara:</strong> saat Anda memakai fitur input suara, audio
                diunggah ke server untuk ditranskripsi dan diekstrak oleh model AI. File audio
                dihapus dari penyimpanan kami segera setelah pemrosesan selesai, baik berhasil
                maupun gagal. Transkrip dan hasil ekstraksinya disimpan sebagai bagian dari
                riwayat pencatatan Anda.
              </li>
              <li>
                <strong>Foto struk:</strong> saat Anda memakai fitur scan struk, foto diunggah
                untuk diekstrak oleh model AI. File foto dihapus dari penyimpanan kami segera
                setelah pemrosesan selesai. Hasil ekstraksinya disimpan.
              </li>
              <li>
                <strong>Riwayat chat AI:</strong> pesan Anda dan balasan asisten disimpan agar
                percakapan dapat dilanjutkan. Anda dapat menghapus riwayat percakapan dari dalam
                Aplikasi.
              </li>
              <li>
                <strong>Laporan kerusakan (crash report):</strong> jika Aplikasi mengalami error,
                laporan teknis dikirim otomatis melalui Sentry untuk membantu kami memperbaiki
                bug. Laporan ini juga berlaku di mode tamu.
              </li>
            </ul>
            <p>
              <strong>Yang tidak kami kumpulkan:</strong> lokasi, kontak, SMS, log panggilan,
              atau isi perangkat Anda di luar yang disebut di atas. Aplikasi tidak memuat iklan
              dan tidak memakai SDK periklanan. Versi saat ini juga belum memakai analytics
              perilaku pengguna.
            </p>

            <h2>3. Izin perangkat dan tujuannya</h2>
            <ul>
              <li>
                <strong>Mikrofon:</strong> hanya aktif saat Anda menahan tombol rekam untuk input
                suara.
              </li>
              <li>
                <strong>Kamera:</strong> hanya dipakai saat Anda memakai fitur scan struk.
              </li>
              <li>
                <strong>Galeri foto:</strong> hanya dipakai saat Anda memilih foto profil.
              </li>
              <li>
                <strong>Notifikasi:</strong> pengingat harian bersifat lokal di perangkat Anda
                (bukan push dari server) dan dapat dimatikan kapan saja di pengaturan Aplikasi.
              </li>
            </ul>

            <h2>4. Bagaimana data dipakai</h2>
            <p>Data Anda dipakai hanya untuk:</p>
            <ul>
              <li>menampilkan dan mengelola catatan keuangan Anda sendiri;</li>
              <li>
                memproses input suara, chat, dan foto struk menjadi draft transaksi melalui model
                AI;
              </li>
              <li>menyediakan backup dan sinkronisasi antar perangkat (mode akun);</li>
              <li>memperbaiki bug dan menjaga keamanan layanan.</li>
            </ul>
            <p>
              Kami tidak menjual data Anda, tidak membagikannya untuk iklan, dan tidak memakainya
              untuk melatih model AI.
            </p>

            <h2>5. Pemroses pihak ketiga</h2>
            <div className="summary-box">
              kami memakai sejumlah layanan infrastruktur untuk menjalankan Savyn. Mereka
              memproses data sesuai instruksi kami.
            </div>
            <ul>
              <li>
                <strong>Google</strong> (Google Sign-In): proses masuk akun.
              </li>
              <li>
                <strong>Supabase</strong>: autentikasi dan penyimpanan database.
              </li>
              <li>
                <strong>Fly.io</strong>: server API, berlokasi di region Singapura.
              </li>
              <li>
                <strong>Cloudflare R2</strong>: penyimpanan file (foto profil; audio dan foto
                struk secara sementara selama pemrosesan).
              </li>
              <li>
                <strong>Upstash</strong>: infrastruktur antrean pemrosesan.
              </li>
              <li>
                <strong>OpenRouter</strong>: pemrosesan AI. Audio suara, transkrip, pesan chat,
                dan gambar struk diteruskan ke penyedia model AI untuk diproses dan menghasilkan
                keluaran yang Anda minta.
              </li>
              <li>
                <strong>Sentry</strong>: pengumpulan laporan kerusakan.
              </li>
            </ul>
            <p>
              Sebagian pemrosesan dan penyimpanan berlangsung di luar Indonesia (antara lain
              Singapura). Kami memilih penyedia dengan standar keamanan industri dan menerapkan
              pengamanan yang wajar untuk transfer tersebut.
            </p>

            <h2>6. Keamanan</h2>
            <p>
              Kami menerapkan enkripsi saat transit (HTTPS/TLS), autentikasi berbasis token,
              penyimpanan sesi terenkripsi di perangkat, pemeriksaan kepemilikan data pada setiap
              permintaan ke server, dan pembatasan laju permintaan. Tidak ada sistem yang dapat
              menjamin keamanan absolut, tetapi kami berupaya melindungi data Anda dengan standar
              yang wajar dan terus memperbaikinya.
            </p>

            <h2>7. Retensi data</h2>
            <ul>
              <li>Data akun dan data keuangan disimpan selama akun Anda aktif.</li>
              <li>
                File audio dan foto struk dihapus dari penyimpanan segera setelah pemrosesan AI
                selesai.
              </li>
              <li>Laporan kerusakan mengikuti kebijakan retensi Sentry.</li>
              <li>
                Setelah Anda menghapus akun, seluruh data Anda dihapus permanen sebagaimana
                dijelaskan di bagian 8.
              </li>
            </ul>

            <h2>8. Hak dan kendali Anda</h2>
            <div className="summary-box">
              Anda bisa mengedit datanya, menghapus riwayat chat, dan menghapus seluruh akun
              langsung dari dalam Aplikasi, tanpa perlu menghubungi kami.
            </div>
            <ul>
              <li>
                <strong>Hapus akun permanen:</strong> tersedia di dalam Aplikasi (Profil &gt;
                Hapus Akun). Tindakan ini menghapus seluruh data keuangan, riwayat chat, file
                tersimpan, dan akun autentikasi Anda. Proses ini tidak dapat dibatalkan.
              </li>
              <li>
                <strong>Hapus riwayat chat AI</strong> dari dalam Aplikasi.
              </li>
              <li>
                <strong>Perbaiki atau ubah data keuangan</strong> kapan saja dari dalam Aplikasi.
              </li>
              <li>
                <strong>Cabut izin perangkat</strong> (mikrofon, kamera, notifikasi) melalui
                pengaturan sistem operasi.
              </li>
              <li>
                Untuk permintaan lain terkait data pribadi Anda, hubungi{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </li>
            </ul>

            <h2>9. Batasan usia</h2>
            <p>
              Savyn tidak ditujukan untuk anak di bawah 13 tahun, dan kami tidak dengan sengaja
              mengumpulkan data dari mereka. Jika Anda meyakini seorang anak telah memberikan
              data kepada kami, hubungi kami agar data tersebut dihapus.
            </p>

            <h2>10. Perubahan kebijakan</h2>
            <p>
              Kebijakan ini dapat diperbarui dari waktu ke waktu. Perubahan material akan
              diumumkan melalui Aplikasi atau halaman ini, dengan tanggal berlaku yang
              diperbarui. Penggunaan berkelanjutan setelah perubahan berarti Anda menyetujui
              kebijakan yang baru.
            </p>

            <h2>11. Kontak</h2>
            <p>
              {DEVELOPER_NAME}
              <br />
              Email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
