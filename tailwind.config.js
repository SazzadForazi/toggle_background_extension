/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#09111f",
        panelSoft: "#101c32",
        panelMuted: "#152644",
        accent: "#38bdf8",
        bull: "#22c55e",
        bear: "#ef4444",
        warn: "#facc15",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(56,189,248,0.35), 0 20px 45px rgba(2,8,23,0.45)",
      },
      fontFamily: {
        sans: ["'Segoe UI'", "Tahoma", "Geneva", "Verdana", "sans-serif"],
      },
    },
  },
  plugins: [],
};
