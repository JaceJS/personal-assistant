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
        canvas: '#0F0F0F',
        surface: '#1A1A1A',
        elevated: '#242424',
        hover: '#2E2E2E',
        primary: '#F0EDE8',
        secondary: '#A8A098',
        muted: '#6B6560',
        disabled: '#3D3A37',
        accent: '#D4A853',
        'accent-subtle': '#2A2218',
        'accent-border': '#7A5C28',
        success: '#7DB87A',
        'success-bg': '#152315',
        danger: '#C97060',
        'danger-bg': '#2A1512',
        warning: '#D4A853',
        'warning-bg': '#2A2218',
        info: '#7A9EC4',
        'info-bg': '#121E2A',
      },
      borderColor: {
        subtle: '#2A2A2A',
        DEFAULT: '#3A3A3A',
        strong: '#505050',
        accent: '#7A5C28',
        danger: '#C97060',
        success: '#7DB87A',
      },
    },
  },
  plugins: [],
};
