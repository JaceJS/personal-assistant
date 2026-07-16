/**
 * Landing page copy per locale. The page structure lives in
 * components/landing.tsx; only the words live here.
 */

export interface LandingContent {
  heroTitleLead: string;
  heroTitleEm: string;
  heroSub: string;
  heroNote: string;
  heroImageAlt: string;
  aboutEyebrow: string;
  aboutTitle: string;
  aboutLede: string;
  aboutBody: string;
  manifestoLead: string;
  manifestoStrong: string;
  manifestoTail: string;
  channelsEyebrow: string;
  channelsTitle: string;
  channelsLede: string;
  channels: { icon: string; title: string; description: string; sample: string }[];
  assistantEyebrow: string;
  assistantTitle: string;
  assistantLede: string;
  proactiveFeatures: { title: string; description: string }[];
  privacyEyebrow: string;
  privacyTitle: string;
  privacyPoints: { title: string; detail: string }[];
  faqEyebrow: string;
  faqTitle: string;
  faqItems: { question: string; answer: string }[];
  ctaFinalTitle: string;
  ctaFinalSub: string;
}

export const LANDING_ID: LandingContent = {
  heroTitleLead: "Catat pengeluaran ",
  heroTitleEm: "secepat kamu ngetik chat",
  heroSub:
    "Savyn mengubah “sate 20rb parkir 2rb” jadi catatan transaksi yang rapi. " +
    "Ketik, ucapkan, atau foto struknya, AI yang membereskan sisanya. Kamu tinggal konfirmasi.",
  heroNote: "Gratis. Bisa dipakai tanpa daftar akun.",
  heroImageAlt:
    "Layar chat AI Savyn: pesan 'sate 20rb parkir 2rb' menjadi dua draft transaksi siap dikonfirmasi",
  aboutEyebrow: "Tentang Savyn",
  aboutTitle: "Savyn itu apa, sih?",
  aboutLede:
    "Savyn adalah asisten keuangan pribadi berbasis AI. Bukan cuma tempat mencatat pengeluaran, " +
    "tapi juga yang mengingatkan, merangkum, dan membantu kamu tetap dalam budget, tanpa perlu " +
    "buka spreadsheet atau isi form panjang.",
  aboutBody:
    "Catat transaksi lewat chat, suara, atau foto struk, AI yang membereskan sisanya jadi catatan " +
    "rapi lengkap dengan kategori. Savyn juga proaktif kasih tahu lewat notifikasi budget dan " +
    "ringkasan mingguan, jadi kamu tetap tahu kondisi keuanganmu tanpa harus rajin buka aplikasi. " +
    "Bisa dipakai langsung tanpa daftar akun, dan gratis.",
  manifestoLead: "Aplikasi keuangan gagal bukan karena kurang fitur. Gagal karena ",
  manifestoStrong: "mencatat itu ribet",
  manifestoTail:
    ". Savyn memangkas ribetnya di setiap situasi: di kasir, di jalan, atau di rumah.",
  channelsEyebrow: "Empat cara mencatat",
  channelsTitle: "Kanal tercepat untuk tiap situasi",
  channelsLede:
    "Lagi di tempat umum? Ketik chat. Sendirian di rumah? Tinggal ngomong. Ada struk? " +
    "Foto saja. Semuanya berakhir jadi satu catatan yang sama rapinya.",
  channels: [
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
  ],
  assistantEyebrow: "Bukan sekadar pencatat",
  assistantTitle: "Asisten yang mengingatkan, bukan menghakimi",
  assistantLede:
    "Setelah tercatat, Savyn yang memantau. Tanpa nada menyalahkan: datanya " +
    "ditunjukkan apa adanya, keputusan tetap di tangan kamu.",
  proactiveFeatures: [
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
      description:
        "Pemasukan, pengeluaran, dan selisih minggu ini tersaji tanpa perlu dihitung manual.",
    },
    {
      title: "AI insight harian",
      description:
        "Satu kalimat pengamatan dari datamu sendiri. Savyn menunjukkan datanya, kesimpulannya tetap milikmu.",
    },
  ],
  privacyEyebrow: "Privasi & kendali",
  privacyTitle: "Data keuanganmu, aturanmu",
  privacyPoints: [
    {
      title: "Bisa dipakai tanpa akun",
      detail: "Mode tamu menyimpan semua data hanya di HP kamu, bukan di server.",
    },
    {
      title: "Tidak terhubung ke bank",
      detail:
        "Savyn tidak pernah meminta akses rekening, e-wallet, atau SMS. Semua data dari input kamu sendiri.",
    },
    {
      title: "Tanpa iklan, tanpa jual data",
      detail: "Datamu dipakai untuk satu hal: menampilkan catatan keuanganmu sendiri.",
    },
    {
      title: "Hapus kapan saja",
      detail: "Hapus akun permanen tersedia di dalam aplikasi, seluruh data ikut terhapus.",
    },
  ],
  faqEyebrow: "FAQ",
  faqTitle: "Pertanyaan yang sering muncul",
  faqItems: [
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
        "transit ke server kami, tidak dijual ke siapa pun, tanpa iklan, dan kamu bisa hapus akun " +
        "beserta seluruh datanya kapan saja dari dalam aplikasi.",
    },
    {
      question: "Seakurat apa pencatatan lewat AI?",
      answer:
        "AI mengubah chat, suara, atau foto struk jadi draft transaksi. Setiap draft selalu kamu " +
        "review dan konfirmasi dulu sebelum tersimpan, jadi angka yang masuk catatan tetap angka " +
        "yang kamu setujui.",
    },
  ],
  ctaFinalTitle: "Mulai dari transaksi berikutnya",
  ctaFinalSub: "Tidak perlu daftar. Buka aplikasinya, catat, selesai.",
};

export const LANDING_EN: LandingContent = {
  heroTitleLead: "Track expenses ",
  heroTitleEm: "as fast as you type a chat",
  heroSub:
    "Savyn turns “lunch 25k parking 2k” into tidy transaction records. " +
    "Type it, say it, or snap the receipt, and AI handles the rest. You just confirm.",
  heroNote: "Free. Works without signing up.",
  heroImageAlt:
    "Savyn AI chat screen: the message 'sate 20rb parkir 2rb' becomes two transaction drafts ready to confirm",
  aboutEyebrow: "About Savyn",
  aboutTitle: "So, what is Savyn?",
  aboutLede:
    "Savyn is an AI-powered personal finance assistant. It's more than a place to log expenses: " +
    "it reminds you, summarizes your spending, and helps you stay on budget, without ever " +
    "opening a spreadsheet or filling out a long form.",
  aboutBody:
    "Log transactions by typing, speaking, or snapping a photo of a receipt, and AI turns it " +
    "into a clean, categorized record. Savyn also checks in proactively with budget alerts and " +
    "weekly summaries, so you always know where you stand without opening the app every day. " +
    "No account needed to start, and it's free.",
  manifestoLead: "Finance apps don't fail from missing features. They fail because ",
  manifestoStrong: "logging is a chore",
  manifestoTail: ". Savyn removes the friction in every situation: at the register, on the go, or at home.",
  channelsEyebrow: "Four ways to log",
  channelsTitle: "The fastest channel for every situation",
  channelsLede:
    "Out in public? Type a chat. Home alone? Just say it. Got a receipt? Snap a photo. " +
    "Everything ends up as the same tidy record.",
  channels: [
    {
      icon: "💬",
      title: "AI Chat",
      description:
        "Type like you're texting a friend. One sentence with several expenses becomes several " +
        "drafts at once. You can also ask about your finances.",
      sample: '"lunch 25k parking 2k" → 2 transaction drafts',
    },
    {
      icon: "🎙️",
      title: "Voice",
      description:
        "Say your transaction out loud, everyday slang included. You review the transcript " +
        "before it becomes a record.",
      sample: '"lunch today, twenty five thousand"',
    },
    {
      icon: "📷",
      title: "Receipt scan",
      description:
        "Photograph your receipt; AI reads it and prepares a transaction draft for you to confirm.",
      sample: "supermarket receipt → automatic draft",
    },
    {
      icon: "⚡",
      title: "Manual entry",
      description:
        "An ultra-compact form for any situation: category optional, the amount field ready to type. " +
        "Done in seconds.",
      sample: "open → type amount → save",
    },
  ],
  assistantEyebrow: "More than a ledger",
  assistantTitle: "An assistant that reminds, never judges",
  assistantLede:
    "Once logged, Savyn keeps watch. No guilt-tripping: it shows the data as it is, " +
    "and the decisions stay yours.",
  proactiveFeatures: [
    {
      title: "Budget alerts at 80% and 100%",
      description:
        "Savyn tells you when spending approaches or passes your budget, per category and monthly.",
    },
    {
      title: "Daily reminder",
      description:
        "One light notification at the time you choose, so logging becomes a habit, not a burden.",
    },
    {
      title: "Weekly summary",
      description: "This week's income, spending, and balance, laid out with no manual math.",
    },
    {
      title: "Daily AI insight",
      description:
        "One-sentence observations from your own data. Savyn shows the numbers; the conclusions stay yours.",
    },
  ],
  privacyEyebrow: "Privacy & control",
  privacyTitle: "Your financial data, your rules",
  privacyPoints: [
    {
      title: "Works without an account",
      detail: "Guest mode keeps all data only on your phone, never on a server.",
    },
    {
      title: "Not connected to your bank",
      detail:
        "Savyn never asks for access to your bank account, e-wallet, or SMS. Every entry comes from you.",
    },
    {
      title: "No ads, no data selling",
      detail: "Your data is used for exactly one thing: showing you your own records.",
    },
    {
      title: "Delete anytime",
      detail: "Permanent account deletion is available in the app; all your data goes with it.",
    },
  ],
  faqEyebrow: "FAQ",
  faqTitle: "Frequently asked questions",
  faqItems: [
    {
      question: "Is Savyn free?",
      answer:
        "Yes, every feature in the current version is free, including AI chat, voice input, and receipt scanning.",
    },
    {
      question: "Do I need to sign up first?",
      answer:
        "No. You can start logging without any account; your data stays local on your phone. " +
        "Google sign-in is only needed for cloud backup and the AI features.",
    },
    {
      question: "Does Savyn connect to my bank account or e-wallet?",
      answer:
        "No, and that's a deliberate design choice. Savyn never asks for access to your bank " +
        "account, e-wallet, or SMS. All data comes from what you log yourself, so you stay in " +
        "full control.",
    },
    {
      question: "Where is my financial data kept safe?",
      answer:
        "Without an account: data lives only on your phone. With an account: data is encrypted " +
        "in transit to our servers, never sold, never used for ads, and you can delete your " +
        "account with all of its data anytime from inside the app.",
    },
    {
      question: "How accurate is AI-powered logging?",
      answer:
        "AI turns your chat, voice, or receipt photo into a transaction draft. You always review " +
        "and confirm each draft before it's saved, so the numbers in your records are the numbers " +
        "you approved.",
    },
  ],
  ctaFinalTitle: "Start with your next transaction",
  ctaFinalSub: "No sign-up needed. Open the app, log it, done.",
};
