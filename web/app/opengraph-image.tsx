import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME}: catat keuangan secepat ngetik chat`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#241A12",
          color: "#FFFCF8",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 40,
            fontWeight: 700,
            color: "#E27A3F",
            marginBottom: 24,
          }}
        >
          Savyn
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 950,
          }}
        >
          Catat pengeluaran secepat kamu ngetik chat
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 30,
            color: "#E27A3F",
            fontFamily: "monospace",
          }}
        >
          {'"sate 20rb parkir 2rb" → 2 transaksi tercatat'}
        </div>
      </div>
    ),
    { ...size }
  );
}
