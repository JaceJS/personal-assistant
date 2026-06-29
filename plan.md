# Rekomendasi Fitur — Positioning: Asisten Pencatat Transaksi Ringan (Indonesia)

_Tanggal: 29 Juni 2026_

## Context

Positioning (dikonfirmasi user): aplikasi ini **"personal assistant pencatat transaksi berbasis AI"
yang RINGAN** — bukan PFM raksasa. **Jangan kejar fitur aplikasi finance besar.** Kompetitor selevel:
**[Finku](https://www.finku.id/)** & **[inputin.app](https://inputin.app/)**.

**Pembacaan kompetitor:**
- **Finku** = lebih berat: FinGPT + **connect rekening bank/e-wallet (auto-record)** + scan e-statement.
  Itu lane aplikasi besar → **JANGAN ditiru** (mahal, butuh izin data keuangan/OJK, lawan user-instruction).
- **inputin.app** = selevel positioning Anda, tapi punya yang aplikasi Anda **belum** punya & semuanya
  cocok untuk asisten ringan: **transaksi berulang**, **pengingat harian** + **ringkasan mingguan**,
  **budget alert 80%/100% saat input**, **dictionary/alias** ("grab"→Transport).

**Insight inti:** aplikasi Anda kini **asisten pasif** — hanya mencatat saat disuruh. Pembeda Anda
(AI/voice bahasa gaul) sudah bagus, tapi sebagai *asisten* ia tak pernah **mengingatkan, memperingatkan,
atau merangkum**. Itulah gap utama vs kompetitor selevel — **dan menutupnya murah, lokal, tanpa
integrasi bank.** Fokus rekomendasi: **jadikan ia asisten yang proaktif**, bukan menambah keluasan PFM.

> Catatan: di plan 0→100 sebelumnya notifikasi sempat *ditunda*. Dalam lensa **market-fit vs kompetitor**
> ini, pengingat/peringatan adalah **inti identitas "asisten"** dan paritas dengan inputin — jadi naik
> jadi prioritas, bukan over-engineering.

---

## Rekomendasi — Bangun Sekarang (ringan, on-positioning)

Urut dari termurah. Semua **lokal**, tanpa integrasi bank, memperkuat identitas "asisten".

**1. Budget alert saat input (paling murah, tanpa izin native)**
- Saat user menyimpan transaksi, jika pengeluaran kategori/bulan tembus **80% / 100%** budget →
  tampilkan peringatan in-app (pakai `useToastStore` atau kartu kecil). Tidak perlu notifikasi sistem.
- Reuse data yang sudah ada: `Budget` (monthly_limit) + `UserCategoryBudget` (limit per kategori) +
  spend-by-category. Titik: alur simpan di `app/(app)/finance/new.tsx` + confirm di `app/ai-assistant.tsx`.

**2. Pengingat harian "Sudah catat hari ini?" (local notification)**
- `expo-notifications` (local, tanpa server/FCM). Jadwal harian (mis. 21:00). Minta izin di momen tepat
  (setelah transaksi pertama). Toggle on/off + jam di Settings. Helper baru `src/lib/notifications.ts`.
- Tambah plugin `expo-notifications` + permission `POST_NOTIFICATIONS` (Android 13+) di `app.json`.

**3. Ringkasan mingguan (asisten yang proaktif merangkum)**
- Kartu "Ringkasan Minggu Ini" (pemasukan/pengeluaran/net + kategori teratas) di Home, dan/atau
  notifikasi lokal mingguan (Senin malam). Reuse data chart/summary yang sudah ada
  (`CashFlowChart`, `TopCategoriesCard`) + nada bahasa dari AI insight (`ai/service.py`, `useAIInsight`).

## Opsional Berikutnya (pilih sesuai appetite — masih ringan)

**4. Transaksi berulang** — gaji/langganan/cicilan auto-post sesuai jadwal (paritas inputin). Build sedang:
   tabel `recurring_transactions` + job/penjadwal sederhana. Sangat "asisten" (ingat untukmu).
**5. Alias/dictionary** — user ajarkan singkatan ("indomaret"→Belanja, "grab"→Transport), diprioritaskan
   sebelum AI. Mempercepat & mengakuratkan pencatatan; memperkuat wedge AI. Build kecil-sedang.
**6. Export CSV / share** — "data kamu, milik kamu". Endpoint export sederhana + share sheet. Build kecil.

## JANGAN Dibangun (over-reach / lane aplikasi besar)
- **Connect API bank/e-wallet (auto-record)** — itu lane Finku; mahal, regulasi data keuangan, lawan positioning.
- Akun rumah-tangga/multi-user, manajemen utang-piutang/paylater penuh, pembayaran QRIS, investasi/saham.
- **Transfer antar-akun** = *opsional correctness* saja (kalau saldo multi-akun jadi keluhan nyata), bukan headline.

---

## Berkas kritis (representatif)
- **Alert saat input:** `app/(app)/finance/new.tsx`, `app/ai-assistant.tsx` (confirm), reuse `useBudget`,
  `UserCategoryBudget`, `useToastStore`.
- **Notifikasi:** baru `mobile/src/lib/notifications.ts`, `app.json` (plugin + permission),
  `app/(app)/settings/index.tsx` (toggle).
- **Ringkasan mingguan:** Home `app/(app)/(home)/index.tsx`, reuse `CashFlowChart`/`TopCategoriesCard`,
  nada dari `backend/app/domains/ai/service.py`.
- **(Opsional) Berulang:** backend domain baru `recurring/` (ikuti pola `finance/`), migration Alembic.

## Verifikasi
1. Catat transaksi yang membuat kategori/bulan tembus 80% → muncul peringatan; 100% → peringatan lebih tegas.
2. Izin notifikasi diminta setelah transaksi pertama; pengingat harian muncul pada jam yang diset; toggle jalan.
3. Kartu ringkasan mingguan menampilkan angka yang benar (cocokkan dengan history).
4. `npm run lint` & `npm test` hijau (di environment dev Anda).

## Prinsip
Menang di **"asisten yang membantu"**, bukan keluasan fitur. Setiap penambahan harus lulus tes:
*"apakah ini membuat MENCATAT lebih mudah, atau membuat asisten lebih proaktif?"* Kalau tidak, jangan dibangun.
