# PRD — Savyn (Pencatat Transaksi Berbasis AI)

| | |
|---|---|
| **Versi dokumen** | 1.1 |
| **Tanggal** | 10 Juli 2026 |
| **Status** | Aktif — pegangan pengembangan v1.0 s.d. Januari 2027 |
| **Rilis yang dicakup** | v1.0 (launch Play Store, weekend 11–13 Juli 2026) + roadmap 6 bulan pasca-launch |
| **Sumber** | Analisis codebase (Juli 2026), `plan.md` (rekomendasi market-fit 29 Juni 2026), `AGENTS.md`, riset web terarah (10 Juli 2026 — lihat Lampiran) |

> **Changelog v1.1 (10 Juli 2026):** nama produk menjadi **Savyn** (rename di kode masuk checklist §5); visi multi-domain (journal/tasks/calendar) DIHAPUS — fokus finance permanen (§1, §3); analisis masalah & target user diperdalam dengan riset web dan reposisi dari kesan voice-first ke "kanal tercepat di tiap situasi" (§2).

---

## 1. Ringkasan & Visi Produk

**Savyn** adalah asisten pencatat transaksi keuangan berbasis AI yang **ringan**, Indonesia-first, Android-first. Pengguna mencatat pemasukan/pengeluaran lewat **kanal tercepat untuk situasinya**: bicara (voice), chat dengan asisten AI berbahasa Indonesia, foto struk, atau input manual — lalu asisten secara proaktif **mengingatkan, memperingatkan, dan merangkum**.

**Tesis produk:** aplikasi pencatat keuangan gagal bukan karena kurang fitur, tapi karena *mencatat itu merepotkan*. Kita menang dengan memangkas friksi mencatat di **setiap situasi transaksi** — bukan dengan satu kanal ajaib, dan bukan dengan menambah keluasan fitur PFM.

**Fokus permanen: keuangan saja.** Savyn tidak akan berkembang menjadi asisten multi-domain (journal, tasks, calendar — stub yang ada di codebase adalah sisa arsitektur, bukan rencana). Keputusan ini final (lihat Non-Goals §3): kedalaman pencatatan dan proaktivitas asisten mengalahkan keluasan domain.

**Litmus test setiap fitur baru:**

> *"Apakah ini membuat MENCATAT lebih mudah, atau membuat asisten lebih PROAKTIF?"*
> Kalau tidak keduanya — jangan dibangun.

---

## 2. Masalah & Target User

> Bagian ini diperdalam di v1.1 dengan riset web terarah (10 Juli 2026). Rujukan `[R#]` mengacu ke daftar sumber di Lampiran. Kesimpulan utamanya: **voice bukan kanal utama yang realistis** — reposisi ke *"kanal tercepat di tiap situasi"*.

### 2.1 Seberapa besar masalahnya

- Retensi day-30 aplikasi finance rata-rata hanya **~4,2%** [R1]; ~70% pengguna aplikasi tracking berhenti dalam 100 hari pertama, dengan **beban input data** sebagai alasan paling konsisten [R2].
- Berhenti mencatat bukan cuma soal teknis: ada **"ostrich effect"** yang terukur — perhatian ke keuangan justru turun saat pengeluaran memburuk (menghindari kabar buruk/rasa bersalah) [R3][R20].
- Di sisi lain, input manual TIDAK dibenci per se: Monefy dipuji justru karena input "2–3 ketukan" [R18]. Yang dibenci adalah form panjang. Friksi diukur dalam detik dan ketukan, bukan di pilihan kanal semata.

### 2.2 Lima friksi pencatatan (taksonomi masalah)

| # | Friksi | Bukti | Konsekuensi desain |
|---|---|---|---|
| F1 | **Celah momen** — transaksi terjadi sekarang, mencatat "nanti malam" | Recall pengeluaran kecil tidak andal; pencatatan batch memburuk progresif (diary fatigue) [R4][R5] | Capture harus bisa dalam hitungan detik, di momen transaksi |
| F2 | **Konteks sosial** — mayoritas transaksi terjadi di tempat umum, dan orang **malu bicara ke HP di publik** | Voice input dinilai tak diterima secara sosial di publik [R6]; 74% pemakaian voice assistant terjadi di rumah [R7]; studi logging multimodal 2025: adopsi audio **nol**, alasan privasi [R8] | Voice = kanal situasional (privat), bukan kanal utama; teks/tap harus setara kelasnya |
| F3 | **Bentuk bukti beragam** — tunai tanpa jejak; QRIS/e-wallet buktinya **layar konfirmasi/screenshot**, bukan struk kertas | Kebiasaan kirim screenshot bukti transfer adalah praktik paling umum [R16]; Finku menjadikan "scan screenshot e-wallet" fitur inti [R17] | Tiap bentuk bukti butuh jalur capture sendiri; scan kamera-only melewatkan bukti terbesar (screenshot) |
| F4 | **Kelelahan kategorisasi** — memilih kategori tiap transaksi adalah friksi nyata | Beban entri = alasan churn #1 [R2]; auto-kategorisasi + konfirmasi satu-tap terbukti memangkas waktu, akurasi naik cepat dari koreksi user [R21] | Jangan pernah paksa pilih kategori saat capture; AI menebak, user hanya konfirmasi/koreksi |
| F5 | **Psikologis** — mencatat saat boros terasa "naburin garam di atas luka" | Financial denial/guilt terdokumentasi [R3][R20]; reminder jam-tetap menopang repetisi tapi tidak membangun kebiasaan [R10]; streak efektif hanya dengan mekanisme pemaafan [R11] | Framing ringkasan & alert harus netral, tidak menghakimi; satu hari bolong tidak boleh terasa "gagal" |

### 2.3 Konteks Indonesia: di mana transaksi terjadi & bukti apa yang tersedia

- **QRIS meledak dan didominasi transaksi kecil**: 59,5 juta pengguna, 15,51 miliar transaksi sepanjang 2025; rata-rata nilai per transaksi ~Rp80–90 ribu dan terus TURUN — artinya frekuensi tinggi, nilai kecil, berkali-kali sehari [R12][R13].
- **E-wallet adalah moda harian** (80% responden memakai untuk transaksi harian; 84–92% untuk makanan) [R14] — dan buktinya berbentuk **layar konfirmasi in-app / push notification / screenshot**, bukan struk.
- **Tunai belum mati**: masih metode #1 di POS untuk banyak segmen (80% masih memakai tunai; dominan untuk bensin, toserba, warung) [R15] — transaksi ini **tanpa jejak digital sama sekali**, hanya bisa ditangkap lewat input cepat oleh user sendiri.
- Implikasi: satu hari pengguna P1 berisi campuran QRIS/e-wallet (bukti = layar), tunai kecil (tanpa bukti), dan sesekali struk kertas. **Tidak ada satu kanal yang optimal untuk semuanya.**

### 2.4 Matriks situasi × kanal (fit saat ini & celah)

| Situasi transaksi | Bukti yang ada | Kanal tercepat (ideal) | Status Savyn v1.0 |
|---|---|---|---|
| Bayar QRIS/e-wallet di kasir, tempat umum | Layar konfirmasi / screenshot | **Import screenshot / share-sheet** → AI ekstrak | ❌ Celah terbesar: scan hanya kamera (`ai-assistant.tsx`), tidak bisa baca screenshot/galeri |
| Tunai kecil sambil jalan (parkir, warung, angkot) | Tidak ada | **Chat singkat / quick-add manual <10 detik** (voice canggung di publik, F2) | ⚠️ Chat AI ada; kecepatan quick-add manual belum diukur sebagai target eksplisit |
| Di rumah / mobil / sendirian | — | **Voice** ("tadi makan siang 25 ribu") | ✅ Ada, dan tetap diferensiasi — tapi situasional |
| Belanja dengan struk kertas (supermarket, resto) | Struk fisik | **Scan kamera** | ✅ Ada |
| Transaksi rutin (gaji, langganan, cicilan) | Berulang & bisa diprediksi | **Tidak perlu dicatat manual sama sekali** (recurring) | ❌ Belum ada (roadmap Fase 2) |
| Lupa mencatat seharian | — | Reminder + entri batch semudah mungkin | ✅ Reminder harian ada; ⚠️ jam-tetap (21:00) — bukti menyarankan cue berbasis event lebih efektif [R10] |

### 2.5 Kesimpulan arah produk (berbasis bukti di atas)

1. **Reposisi dari "voice-first" ke "kanal tercepat di tiap situasi".** Tidak ditemukan satu pun testimoni organik user yang rutin mencatat dengan voice — semua klaim datang dari vendor [R19]. Voice tetap dipertahankan sebagai diferensiasi untuk konteks privat, tapi messaging, onboarding, dan investasi fitur tidak boleh mengasumsikan voice sebagai kanal dominan. Chat + quick-add adalah kanal kerja harian di ruang publik.
2. **Celah capture #1 yang harus ditutup: bukti berbentuk layar** — import screenshot/galeri (+ share-sheet Android) untuk konfirmasi QRIS/e-wallet/transfer. Ini pola perilaku khas Indonesia [R16], sudah divalidasi kompetitor terkuat [R17], dan secara teknis reuse pipeline receipt yang ada (masuk roadmap §7 Fase 2).
3. **Kecepatan diukur, bukan diasumsikan**: tetapkan target eksplisit "capture <10 detik" untuk chat & manual; instrumentasi §6 harus mengukur durasi capture per kanal.
4. **Kategori tidak boleh menghambat capture** (F4): alias/dictionary di roadmap diperluas framing-nya menjadi "auto-kategorisasi yang belajar dari koreksi user".
5. **Desain anti-guilt** (F5): ringkasan mingguan & budget alert memakai framing netral ("ini datanya") bukan menghakimi ("kamu boros"); pertimbangkan cue berbasis event untuk reminder. Murah — level copywriting & timing, bukan fitur baru.

### 2.6 Persona (HIPOTESIS — belum divalidasi data user nyata)

> ⚠️ Belum ada data user sendiri. Persona tetap hipotesis kerja — kini didukung data pasar sekunder (§2.3), tapi **wajib divalidasi** lewat feedback loop §6.

**P1 — "Pekerja muda urban" (persona utama)**
Usia 20–30, Gen Z/milenial (segmen dominan e-wallet [R14]), gajian bulanan, transaksi harian campur QRIS/e-wallet kecil-kecil + tunai informal. Pernah coba mencatat dan berhenti karena ribet.
*Job-to-be-done:* "catat pengeluaran ini TANPA menghentikan aktivitasku."
*Validasi pasca-launch:* kanal mana yang benar-benar dipakai (share input per kanal); durasi capture; D7.

**P2 — "Penabung bertarget" (persona sekunder)**
Punya tujuan konkret (dana darurat, nikah, gadget). *Job-to-be-done:* "tunjukkan progresku dan tegur aku SEBELUM kelewat batas — tanpa bikin aku merasa dihakimi (F5)."
*Validasi:* engagement savings goals & budget alert; apakah alert memicu koreksi perilaku atau uninstall.

**P3 — "Pencoba skeptis" (persona akuisisi)**
Tidak mau daftar akun sebelum yakin; sensitif privasi data keuangan. *Job-to-be-done:* "buktikan dulu nilainya, baru minta komitmenku."
*Validasi:* rasio guest→signup; titik drop-off onboarding.

---

## 3. Positioning & Non-Goals

### Peta kompetitor

| Kompetitor | Posisi | Sikap kita |
|---|---|---|
| **inputin.app** | Peer terdekat — pencatat ringan dengan pengingat, transaksi berulang, budget alert, alias | **Paritas + kalahkan di diferensiasi AI** (voice bahasa gaul, chat assistant bertool, scan struk) |
| **Finku** | Lebih berat — FinGPT + auto-link rekening bank/e-wallet, scan e-statement | **Jangan ditiru.** Lane aplikasi besar: mahal, regulasi data keuangan/OJK, bertentangan dengan positioning ringan |

### Diferensiasi kita (yang sudah ada di v1.0)

1. **AI chat assistant Bahasa Indonesia** yang bisa *bertindak* (buat draft transaksi — termasuk multi-draft dari satu kalimat, jawab "budget makan sisa berapa") — bukan sekadar chatbot tips.
2. **Voice input bahasa sehari-hari/gaul** → transaksi terstruktur.
3. **Guest mode penuh** (SQLite lokal) + migrasi mulus ke cloud saat signup.
4. **Scan struk** (vision LLM).

### NON-GOALS — eksplisit TIDAK dibangun

Daftar ini adalah keputusan produk, bukan keterbatasan sementara. Setiap ide fitur yang menyerempet daftar ini ditolak by default:

- ❌ **Auto-link rekening bank / e-wallet** (auto-record) — lane Finku; mahal, regulasi OJK, melawan positioning.
- ❌ **Akun rumah tangga / multi-user.**
- ❌ **Manajemen utang-piutang / paylater penuh.**
- ❌ **Pembayaran QRIS** (aplikasi ini mencatat, bukan membayar).
- ❌ **Investasi / saham / crypto tracking.**
- ❌ **Ekspansi domain non-keuangan: journal, tasks, calendar** — keputusan permanen (v1.1), bukan penundaan. Stub di codebase (`backend/app/domains/`) tidak akan diisi; kandidat untuk dibersihkan.
- ⚠️ **Transfer antar-akun** — bukan headline; hanya dipertimbangkan sebagai *correctness fix* jika saldo multi-akun jadi keluhan nyata dari user.

---

## 4. Kondisi Produk Saat Ini (per 10 Juli 2026 — isi v1.0)

### Sudah terbangun & masuk v1.0

**Core keuangan**
- Akun (multi-akun, tipe, saldo awal bisa diedit, arsip/soft-delete).
- Transaksi (manual, riwayat, detail, filter kategori multi-select & rentang tanggal).
- 35 kategori default + kategori kustom user.
- Budget bulanan + limit per kategori, dengan label % overspend aktual.
- Savings goals (tab sendiri: target, progres, kontribusi).
- Chart: cash flow, spend per kategori, proyeksi akhir bulan, performa tahunan.

**AI (wedge utama)**
- Voice → transaksi: rekam → STT → ekstraksi LLM → draft → konfirmasi user. Ada retry upload; confidence < 0.4 ditolak (guardrail).
- Scan struk → transaksi (vision LLM). **Keterbatasan v1.0:** hanya dari kamera (`launchCameraAsync` di `mobile/app/ai-assistant.tsx`) — belum bisa import screenshot/galeri, padahal bukti transaksi cashless umumnya berbentuk layar konfirmasi (lihat §2).
- AI chat assistant (Bahasa Indonesia) dengan 6 tools: financial summary, daftar akun, status budget, transaksi terakhir, spending per kategori, buat transaksi (multi-draft per pesan). Riwayat chat tersimpan & bisa dihapus; draft chat persist saat app ditutup.
- AI insight card di Home.
- Scope AI dibatasi ke keuangan (menolak pertanyaan di luar topik); `max_tokens` dibatasi; limit dari LLM di-clamp sebelum menyentuh SQL.

**Asisten proaktif** (3 rekomendasi utama `plan.md` — ✅ semua terbangun)
- Budget alert 80%/100% saat input transaksi.
- Pengingat harian "sudah catat hari ini?" (local notification, izin diminta lewat explainer sheet, toggle + jam di Settings).
- Ringkasan mingguan di Home.

**Akuisisi & lifecycle**
- Guest mode penuh: data di SQLite lokal, tanpa akun.
- Signup → bulk-import data guest ke cloud (validasi ownership, saldo akun ikut ter-apply).
- Onboarding: welcome → profil (nama) → akun pertama; checklist first-run di Home; coachmark tombol AI.
- Hapus akun permanen (wajib Play Store) termasuk hapus objek R2; WhatsApp support link di Settings.

**Fondasi teknis** (ringkas — detail di `AGENTS.md`)
- Expo RN (SDK 54) + FastAPI + PostgreSQL (Supabase, auth-only di sisi mobile) + Cloudflare R2 + OpenRouter (STT & LLM). Background job voice/receipt pakai FastAPI `BackgroundTasks` in-process; rate limiting & daily insight cache disimpan di Postgres (bukan Redis/ARQ lagi — lihat commit `9f302d02`). Upload validation, session terenkripsi at rest, ownership check di setiap endpoint.

### Belum terbangun (kandidat roadmap — lihat §7)

- Transaksi berulang (gaji/langganan/cicilan auto-post).
- Alias/dictionary ("grab" → Transport) yang diajarkan user.
- Export CSV / share data.
- Import screenshot/galeri untuk bukti transaksi cashless (scan saat ini kamera-only).

---

## 5. Rilis v1.0 — Launch Play Store (weekend 11–13 Juli 2026)

### Scope freeze

**Tidak ada fitur baru sebelum launch.** Sisa pekerjaan hanya blocker rilis dan bugfix kritis.

### Checklist blocker (status per 10 Juli 2026)

| # | Item | Status | Catatan |
|---|---|---|---|
| 1 | `mobile/eas.json` + konfigurasi EAS production build | ✅ Selesai | `eas.json` (profile development/staging/production) + project linked ke akun EAS `jaceee` (`app.json` `extra.eas.projectId`, `owner`) |
| 2 | URL Privacy Policy & Terms nyata | ✅ Selesai | Site `web/` (Next.js) live di Vercel: `https://www.savyn.id` (landing + `/privacy` + `/terms`); URL di `settings/index.tsx` sudah diganti. Sisa: isi URL privacy policy di Play Console |
| 3 | Data Safety form di Play Console | ❌ Di luar repo | Deklarasikan: data keuangan user, audio (voice), foto (struk/avatar), email; hapus-akun tersedia |
| 4 | Backend produksi di Fly.io (API, single process — job/cache/rate-limit di Postgres) | ✅ Selesai | App `savyn-api` (region `sin`), `fly.toml` (process `app` saja, worker ARQ + Redis dihapus 19 Juli 2026), DB Supabase prod, semua migrasi (`alembic upgrade head`) sudah jalan. Health check `https://savyn-api.fly.dev/health` OK. Staging: app `savyn-api-staging` (`fly.staging.toml`) juga sudah deploy dengan pola yang sama. |
| 5 | Smoke test alur kritis di build produksi | ❌ Belum dijalankan | Prasyarat: `mobile/.env` `EXPO_PUBLIC_API_URL` masih nunjuk `http://10.0.2.2:8000` (localhost), harus diganti ke `https://savyn-api.fly.dev` dulu. Alur: Guest → catat (manual/voice/chat) → signup → data ter-sync → hapus akun |
| 6 | `versionCode` Android | ✅ Sudah diset | |
| 7 | Hapus akun permanen (kebijakan Play Store) | ✅ Terbangun | |
| 8 | Rename aplikasi ke **Savyn** di kode | ✅ Selesai | `mobile/app.json` (`name`, `slug: savyn`, `scheme: savyn`, `android.package: com.salendah_labs.savyn`), `package.json` (`name: savyn`), template WhatsApp support di `mobile/app/(app)/(tabs)/settings/index.tsx`. Nama listing Play Console masih di luar repo. |

### Kriteria "siap rilis"

Semua item ❌ di atas selesai + smoke test #5 lulus di build AAB produksi (bukan dev client).

---

## 6. Metrik Sukses & Feedback Loop

Belum ada data user — maka **pekerjaan produk pertama pasca-launch adalah mengukur**, bukan menambah fitur.

### Metrik utara (north star)

**Transaksi tercatat per user aktif per minggu.** Ini proxy langsung dari "mencatat jadi kebiasaan" — satu-satunya hal yang membuat produk ini hidup.

### Metrik pendukung

| Metrik | Definisi | Target awal (hipotesis) |
|---|---|---|
| Activation | Guest/user baru mencatat transaksi pertama ≤ 5 menit sejak install | ≥ 60% install |
| Kebiasaan | Transaksi/user aktif/minggu | ≥ 5 |
| Retensi D7 / D30 | User kembali membuka & mencatat | D7 ≥ 25%, D30 ≥ 12% |
| Share input **per kanal** | % transaksi via voice vs chat vs scan vs manual (dipisah per kanal, bukan digabung "AI") | Tidak ada target — ini data validasi reposisi §2.5; total kanal AI ≥ 40% tetap jadi sinyal wedge |
| Durasi capture per kanal | Detik dari buka-entry sampai transaksi tersimpan, per kanal | Chat & manual < 10 detik (target §2.5) |
| Konversi guest → akun | Guest yang akhirnya signup | ≥ 20% |
| Akurasi ekstraksi | Draft AI dikonfirmasi tanpa edit | ≥ 70% |
| Biaya AI | Biaya OpenRouter / user aktif / bulan | Pantau sejak hari 1 (lihat §8 risiko #1) |

Target di atas adalah tebakan terdidik untuk memberi garis start — direvisi setelah 4–6 minggu data nyata. Sebagai kalibrasi: retensi D30 rata-rata industri aplikasi finance hanya ~4,2% [R1], jadi target 12% ambisius (~3× benchmark) — sadar dipasang tinggi karena produk hidup-mati di retensi.

### Feedback loop (urutan pemasangan)

1. **Sudah ada di v1.0:** WhatsApp support link di Settings (kanal feedback langsung), review Play Store.
2. **Fase 1 (wajib, bukan opsional):** crash reporting (mis. Sentry) + analytics event ringan (install → activation → transaksi per kanal input → retensi). Tanpa ini semua metrik di atas buta.
3. **Ritme:** review mingguan feedback WhatsApp + review Play Store; label tiap masukan → bugfix / kandidat roadmap / tolak (non-goal).

---

## 7. Roadmap 6 Bulan (Juli 2026 – Januari 2027)

Bergerbang **metrik & feedback**, bukan tanggal kaku. Setiap item dicantumkan dengan masalah yang diselesaikan dan ukuran keberhasilannya. Semua item lolos litmus test (§1).

### Fase 1 — Stabilisasi & Dengar (± bulan 1: Juli–Agustus)

*Tidak ada fitur besar.* Tujuan: pipeline data & feedback hidup, app stabil.

| Item | Masalah yang diselesaikan | Ukuran berhasil |
|---|---|---|
| Crash reporting + analytics event — **termasuk share input per kanal & durasi capture per kanal** (§2.5) | Buta terhadap §6; asumsi kanal tak tervalidasi | Semua metrik §6 terukur otomatis; diketahui kanal mana yang benar-benar dipakai |
| Bugfix dari feedback WhatsApp/review | Kepercayaan user awal | Rating stabil ≥ 4.0; crash-free ≥ 99% |
| Tuning prompt STT/ekstraksi dari kasus gagal nyata | Akurasi bahasa gaul | Akurasi ekstraksi naik dari baseline |
| Audit framing anti-guilt pada copy ringkasan & budget alert (F5, §2.5) — level copywriting, bukan fitur | Guilt/ostrich effect memicu abandonment [R3] | Alert/ringkasan tidak memicu lonjakan uninstall/opt-out |

**Gerbang keluar Fase 1:** metrik §6 terukur + tidak ada bug kritis terbuka.

### Fase 2 — Perkuat Pencatatan (± bulan 2–3: September–Oktober)

Tiga kandidat yang lolos litmus test; **urutan pengerjaan ditentukan sinyal Fase 1**, dan dengan satu developer realistisnya 2 dari 3 yang selesai di fase ini:

| Item | Masalah yang diselesaikan | Litmus | Ukuran berhasil |
|---|---|---|---|
| **Import screenshot/galeri + share-sheet** untuk bukti QRIS/e-wallet/transfer (celah capture #1, §2.5; reuse pipeline receipt yang ada — tambah `launchImageLibraryAsync` + Android share intent) | Bukti transaksi cashless berbentuk layar, bukan struk; scan kamera-only melewatkannya (F3) [R16][R17] | Mencatat lebih mudah untuk moda pembayaran dominan | Share input via scan naik; % transaksi e-wallet tercatat naik |
| **Transaksi berulang** (gaji/langganan/cicilan auto-post; backend domain baru `recurring/` mengikuti pola `finance/`; scheduling via Postgres, bukan ARQ — stack job sudah pindah ke Postgres, lihat §4) | Transaksi rutin harus dicatat manual tiap bulan (F1) | Asisten "mengingat untukmu" → proaktif | ≥ 30% user aktif memasang ≥ 1 recurring; transaksi/user/minggu naik |
| **Auto-kategorisasi yang belajar** (alias/dictionary: "indomaret" → Belanja, diprioritaskan sebelum LLM; belajar dari koreksi user) | Kelelahan kategorisasi & ekstraksi salah kategori (F4) [R21] | Mencatat lebih cepat & akurat | Edit-rate kategori pada draft turun; durasi capture turun |

**Gerbang masuk per item:** ada sinyal kebutuhan dari feedback/metrik Fase 1 (mis. % transaksi e-wallet yang tak tercatat, keluhan "capek catat gaji tiap bulan", edit-rate kategori tinggi). Jika sinyal tidak muncul, item ditunda — bukan dibangun karena sudah tertulis di sini.

### Fase 3 — Kepemilikan Data & Realokasi Kanal (± bulan 4–6: November 2026–Januari 2027)

| Item | Masalah yang diselesaikan | Ukuran berhasil |
|---|---|---|
| **Export CSV/Excel / share** ("data kamu, milik kamu") | Kekhawatiran lock-in; ekspor termasuk fitur yang paling sering diminta di kategori ini [R22] | Dipakai tanpa jadi penyebab churn |
| **Quick-add widget / lock-screen** (capture <10 detik tanpa buka app) | Celah momen (F1); logging low-burden di widget terbukti menopang adherence [R9] | Durasi capture turun; transaksi/user/minggu naik |
| **Decision gate realokasi kanal input** | Validasi kanal mana yang layak investasi lanjutan | Lihat kriteria di bawah |

**Decision gate realokasi kanal (menggantikan gate ekspansi domain — ekspansi non-finance sudah jadi Non-Goal §3):**
Setelah ±4 bulan data kanal (share input & durasi capture per kanal, §6):
1. Kanal dengan pemakaian tinggi → dapat investasi penajaman (mis. kalau chat dominan: perbaiki latensi & multi-draft; kalau scan dominan: perluas format bukti).
2. Kanal dengan pemakaian rendah → turunkan prioritas UI/biaya (mis. voice jarang dipakai → geser dari posisi FAB utama?); JANGAN buru-buru dihapus — cukup berhenti menginvestasikan.
3. North star (transaksi/user/minggu) dan retensi D30 tetap acuan: fitur kanal apa pun yang tidak menggerakkan keduanya dalam 2 bulan dievaluasi ulang.

### Kandidat parkir (dipertimbangkan hanya jika ada sinyal kuat)

- Transfer antar-akun (correctness fix, lihat §3).
- Notifikasi ringkasan mingguan versi push terjadwal (versi kartu sudah ada).
- Reminder berbasis event/rutinitas menggantikan jam-tetap 21:00 (bukti menyarankan cue kontekstual lebih membangun kebiasaan [R10]).
- Kanal WhatsApp (bot pendamping app) — tren capture low-friction paling ramai di Indonesia justru bot WA [R19]; berpotensi besar tapi mengubah arsitektur & biaya. Butuh validasi permintaan organik + hitung biaya sebelum dipertimbangkan serius.
- iOS / App Store (milestone terpisah, di luar horizon dokumen ini).

---

## 8. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| 1 | **Biaya LLM/STT per user aktif** membengkak seiring adopsi voice/chat (OpenRouter dibayar per panggilan; user gratis) | Unit economics negatif | Ukur biaya/user sejak hari 1 (§6); `max_tokens` sudah dibatasi; rate limiting sudah ada; siapkan opsi model lebih murah via env `STT_MODEL`/`LLM_MODEL` (sudah configurable); tentukan ambang biaya yang memicu keputusan monetisasi |
| 2 | **Akurasi STT/ekstraksi untuk bahasa gaul & campur kode** lebih buruk di lapangan daripada di pengujian sendiri | Wedge utama kehilangan kredibilitas | Guardrail confidence < 0.4 sudah menolak draft; kumpulkan kasus gagal (Fase 1) → tuning prompt/alias (Fase 2); UX konfirmasi draft memastikan user selalu memvalidasi |
| 3 | **Kegagalan migrasi guest → cloud** merusak kepercayaan justru pada momen konversi | Kehilangan user paling berharga (yang mau signup) | Smoke test alur ini masuk checklist rilis (§5); validasi ownership & apply saldo sudah dikerjakan; monitor error rate endpoint sync sejak hari 1 |
| 4 | **Kebijakan Play Store** (Data Safety tidak akurat, kebijakan data keuangan) → app ditolak/di-takedown | Launch gagal / app hilang dari store | Isi Data Safety jujur & lengkap (§5 #3); hapus akun sudah ada; privacy policy nyata sebelum submit |
| 5 | **Solo developer (bus factor & kecepatan)** — roadmap ini dikerjakan satu orang | Fase molor, burnout | Roadmap bergerbang sinyal (2–3 kandidat per fase, tidak semua wajib selesai); scope freeze disiplin; non-goals (§3) memangkas permintaan fitur di luar jalur |
| 6 | **Ketergantungan pihak ketiga** (Supabase auth, OpenRouter, Fly.io, R2) | Outage = fitur inti mati | Abstraksi provider AI sudah ada (`LLMProvider`/`STTProvider` — ganti model via env); guest mode = degradasi anggun untuk pencatatan saat backend down |
| 7 | **Gelombang bot WhatsApp** (Catatmak, Mingo, dsb. [R19]) mengkomoditisasi pencatatan low-friction — user tak perlu buka app sama sekali | Wedge "capture termudah" tersaingi di kenyamanan | Pantau sebagai kandidat kanal (§7 parkir); diferensiasi Savyn yang bot WA sulit tiru: dashboard visual, budget/goals, guest mode privasi-lokal; keputusan berdasarkan permintaan organik + unit cost |

---

## 9. Open Questions (hanya terjawab oleh data pasca-launch)

1. Kanal input mana yang benar-benar dipakai — voice, chat, scan, atau justru manual? Riset sekunder memprediksi voice minoritas (§2.5), tapi hanya data user sendiri yang memutuskan realokasi kanal (§7 Fase 3).
2. Apakah pengingat harian meningkatkan retensi atau memicu uninstall — dan apakah cue berbasis event/rutinitas mengalahkan jam-tetap 21:00 [R10]? (A/B sederhana lewat toggle & jam default.)
3. Berapa biaya AI riil per user aktif, dan di titik mana monetisasi (freemium? batas kuota AI?) harus diputuskan?
4. Apakah persona P1 (pekerja muda urban) benar persona dominan, atau justru segmen lain (mahasiswa, pedagang kecil)?
5. Seberapa besar guest mode berkontribusi ke akuisisi vs langsung signup?
6. Apakah Savyn perlu hadir di WhatsApp (bot pendamping app [R19]) — kanal tempat capture low-friction paling ramai di Indonesia — atau tetap app-first? Butuh bukti permintaan organik + hitung unit cost sebelum dijawab.

---

## Lampiran — Referensi

### Dokumen internal

- `plan.md` (root repo) — analisis kompetitor & rekomendasi 29 Juni 2026. Status: rekomendasi #1–#3 (budget alert, pengingat harian, ringkasan mingguan) ✅ terbangun; #4–#6 (recurring, alias, export) diserap ke roadmap §7.
- `AGENTS.md` (root, `backend/`, `mobile/`) — arsitektur, aturan keamanan, konvensi kode.
- `graphify-out/GRAPH_REPORT.md` — peta struktur codebase (snapshot 6 Juni 2026; belum mencakup AI chat, savings goals, sync, users).

### Sumber riset web (diakses 10 Juli 2026)

**Perilaku & retensi**
- [R1] Business of Apps — Finance App Benchmarks (retensi D30 finance ~4,2%): https://www.businessofapps.com/data/finance-app-benchmarks/
- [R2] JMIR 2024 — *When and Why Adults Abandon Lifestyle Behavior Apps* (scoping review, ~70% berhenti ≤100 hari; beban input alasan utama): https://pmc.ncbi.nlm.nih.gov/articles/PMC11694054/
- [R3] Olafsson & Pagel, NBER w23945 — ostrich effect pada perhatian finansial: https://www.nber.org/papers/w23945
- [R4] JSSAM 2022 — underreporting pembelian kecil pada metode recall: https://academic.oup.com/jssam/article/10/5/1148/6359605
- [R5] Journal of Nutrition 2017 — diary fatigue: pencatatan memburuk progresif (FoodAPS): https://academic.oup.com/jn/article/147/5/964/4584758
- [R10] Stawarz, Cox & Blandford, CHI 2015 — reminder jam-tetap menopang repetisi, bukan kebiasaan; cue berbasis event lebih baik: https://discovery.ucl.ac.uk/id/eprint/1468224/
- [R11] Duolingo Blog — desain streak & streak freeze (pemaafan mengurangi churn): https://blog.duolingo.com/improving-the-streak/

**Voice & metode input**
- [R6] Pandey, Hasan & Arif, CHI 2021 — social acceptability speech input di ruang publik: https://life.theiilab.com/pub/Pandey_CHI2021_Silent_Speech_Acceptability.pdf
- [R7] PwC Consumer Intelligence Series 2018 — 74% pemakaian voice assistant terjadi di rumah: https://www.pwc.com/us/en/services/consulting/library/consumer-intelligence-series/voice-assistants.html
- [R8] SnappyMeal, arXiv 2511.03907 (2025) — studi logging multimodal 21 hari: adopsi audio nol (privasi publik): https://arxiv.org/html/2511.03907
- [R9] Choe et al., UbiComp 2015 — SleepTight: lock-screen widget sebagai low-burden logging: http://faculty.washington.edu/jkientz/papers/Choe-SleepTight-UbiComp2015.pdf
- [R21] ExpenseSorted / DocuClipper (klaim industri, bukan peer-review) — auto-kategorisasi & pembelajaran dari koreksi: https://www.docuclipper.com/blog/automatic-transaction-categorization/

**Konteks pasar Indonesia**
- [R12] GoodStats (data BI) — QRIS 2025: 59,5 jt pengguna, 15,51 miliar transaksi, Rp1.420,66 T: https://goodstats.id/article/qris-tumbuh-pesat-sepanjang-2025-digunakan-lebih-dari-59-juta-orang-L9I0G
- [R13] Kompas, 3 Feb 2026 — ticket size QRIS UMKM Rp88.716 & menurun: https://money.kompas.com/read/2026/02/03/180231126/bi-transaksi-qris-didominasi-umkm-volume-dan-nilainya-terus-naik
- [R14] Jakpat 2025 (via Jubelio/GoodStats) — e-wallet 80% transaksi harian; 84–92% pembayaran makanan; dominan Gen Z/milenial: https://jubelio.com/hasil-survei-dompet-digital-paling-favorit-di-indonesia/
- [R15] Visa Consumer Payment Attitudes 2024 & Worldpay GPR — tunai masih metode #1 POS untuk banyak segmen: https://infobanknews.com/studi-visa-80-persen-masyarakat-masih-demen-transaksi-uang-tunai/
- [R16] VIDA / DOKU / Jalin — screenshot bukti transfer sebagai praktik paling umum (dan penyalahgunaannya): https://vida.id/id/blog/bukti-transfer-palsu
- [R20] IDN Times — "financial denial": alasan psikologis malas mencatat: https://www.idntimes.com/business/finance/5-alasan-seseorang-malas-mencatat-pemasukan-dan-pengeluaran-01-p276n-4z7lhk

**Kompetitor**
- [R17] Finku — positioning "Atur Keuangan Otomatis", Record with AI (e-statement, struk, screenshot e-wallet), Google Play Best Hidden Gem 2025: https://www.finku.id/id
- [R18] DompetSimpel — Monefy dipuji karena input 2–3 ketukan: https://dompetsimpel.com/aplikasi-catat-pengeluaran-terbaik-gratis/
- [R19] Gelombang bot WhatsApp pencatat keuangan (Catatmak, Mingo, Ikisae, Sakoo, dll.): https://catatmak.com/ , https://mingo.id/
- [R22] Pohontomat / Play Store — ekspor Excel, offline, backup sebagai fitur yang paling dipuji/diminta di tracker lokal: https://www.pohontomat.com/2021/01/review-aplikasi-catatan-keuangan-harian.html

**Keterbatasan riset:** review Play Store per-user dan thread Reddit (r/finansial) tidak dapat diakses crawler; sebagian angka berasal dari blog vendor (ditandai di teks). Data survei panel online (Jakpat) bias urban/muda. Semua temuan sekunder ini adalah *proxy* — data user Savyn sendiri (§6) tetap hakim terakhir.
