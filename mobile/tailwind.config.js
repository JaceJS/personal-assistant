/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0a0f1e",
        surface: "#111827",
        card: "#1e293b",
        border: "#334155",
        accent: "#6366f1",
        "accent-2": "#8b5cf6",
        success: "#10b981",
        danger: "#f43f5e",
        ink: "#f8fafc",
        muted: "#94a3b8",
      },
      fontFamily: {
        sans: ["Outfit_400Regular"],
        medium: ["Outfit_500Medium"],
        semibold: ["Outfit_600SemiBold"],
        bold: ["Outfit_700Bold"],
      },
    },
  },
  plugins: [],
};
