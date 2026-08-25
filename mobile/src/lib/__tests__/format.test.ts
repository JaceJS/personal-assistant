import i18n from "@/i18n";
import {
  formatChatDaySeparator,
  formatDateLabel,
  formatMoney,
  formatRelativeTime,
  getMonthNames,
  toYmd,
} from "../format";

describe("format helpers", () => {
  afterEach(async () => {
    await i18n.changeLanguage("id");
  });

  describe("formatMoney", () => {
    it("formats IDR with Indonesian separators when language is id", async () => {
      await i18n.changeLanguage("id");
      expect(formatMoney(10000)).toMatch(/Rp\s?10\.000/);
    });

    it("formats IDR with English separators when language is en", async () => {
      await i18n.changeLanguage("en");
      expect(formatMoney(10000)).toMatch(/IDR\s?10,000/);
    });

    it("is currency-agnostic via the currency parameter", async () => {
      await i18n.changeLanguage("en");
      expect(formatMoney(10000, "USD")).toMatch(/\$\s?10,000/);
    });

    it("shows no decimal fraction", async () => {
      await i18n.changeLanguage("id");
      expect(formatMoney(10500)).not.toMatch(/,00|\.00/);
    });
  });

  describe("getMonthNames", () => {
    it("returns 12 Indonesian month names for id", async () => {
      await i18n.changeLanguage("id");
      const months = getMonthNames();
      expect(months).toHaveLength(12);
      expect(months[0]).toBe("Januari");
      expect(months[7]).toBe("Agustus");
    });

    it("returns English month names for en", async () => {
      await i18n.changeLanguage("en");
      const months = getMonthNames();
      expect(months[0]).toBe("January");
      expect(months[11]).toBe("December");
    });
  });

  describe("formatDateLabel", () => {
    function ymd(d: Date): string {
      return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");
    }

    it("labels today and yesterday in Indonesian", async () => {
      await i18n.changeLanguage("id");
      const today = new Date();
      const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      expect(formatDateLabel(ymd(today))).toMatch(/^Hari ini - /);
      expect(formatDateLabel(ymd(yesterday))).toMatch(/^Kemarin - /);
    });

    it("labels today in English", async () => {
      await i18n.changeLanguage("en");
      expect(formatDateLabel(ymd(new Date()))).toMatch(/^Today - /);
    });

    it("returns a plain localized date for older days", async () => {
      await i18n.changeLanguage("id");
      const label = formatDateLabel("2026-01-05");
      expect(label).not.toMatch(/Hari ini|Kemarin/);
      expect(label).toContain("Januari");
    });
  });

  describe("toYmd", () => {
    const originalTZ = process.env.TZ;

    beforeAll(() => {
      process.env.TZ = "Asia/Jakarta";
    });

    afterAll(() => {
      process.env.TZ = originalTZ;
    });

    it("uses the local calendar day, not the UTC day, when a UTC instant crosses local midnight", () => {
      expect(toYmd(new Date("2026-08-25T18:00:00Z"))).toBe("2026-08-26");
    });

    it("matches the Date's own local getters", () => {
      const d = new Date("2026-01-05T10:00:00Z");
      const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      expect(toYmd(d)).toBe(expected);
    });
  });

  describe("formatChatDaySeparator", () => {
    function daysAgo(n: number): Date {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d;
    }

    it("labels today in Indonesian", async () => {
      await i18n.changeLanguage("id");
      expect(formatChatDaySeparator(daysAgo(0))).toBe("Hari ini");
    });

    it("labels yesterday in Indonesian", async () => {
      await i18n.changeLanguage("id");
      expect(formatChatDaySeparator(daysAgo(1))).toBe("Kemarin");
    });

    it("uses a bare weekday name for 2-6 days ago", async () => {
      await i18n.changeLanguage("id");
      const label = formatChatDaySeparator(daysAgo(3));
      expect(label).not.toMatch(/Hari ini|Kemarin/);
      expect(label).toMatch(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)$/);
    });

    it("uses the full date for 7+ days ago", async () => {
      await i18n.changeLanguage("id");
      const label = formatChatDaySeparator(daysAgo(10));
      expect(label).not.toMatch(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)$/);
      expect(label).toMatch(/\d{4}/);
    });

    it("treats calendar-day boundaries correctly, not 24h windows", async () => {
      await i18n.changeLanguage("id");
      const justAfterMidnight = new Date();
      justAfterMidnight.setHours(0, 5, 0, 0);
      expect(formatChatDaySeparator(justAfterMidnight)).toBe("Hari ini");
    });
  });

  describe("formatRelativeTime", () => {
    it("translates relative time in Indonesian", async () => {
      await i18n.changeLanguage("id");
      expect(formatRelativeTime(new Date().toISOString())).toBe("Baru saja");
      const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
      expect(formatRelativeTime(fiveMinAgo)).toBe("5 menit lalu");
    });

    it("pluralizes in English", async () => {
      await i18n.changeLanguage("en");
      const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
      const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
      expect(formatRelativeTime(oneMinAgo)).toBe("1 min ago");
      expect(formatRelativeTime(fiveMinAgo)).toBe("5 mins ago");
    });
  });
});
