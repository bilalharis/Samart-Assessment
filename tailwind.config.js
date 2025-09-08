/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        // same names your Landing uses
        "royal-blue": "#143F8C",
        "brand-yellow": "#F7C948",
        "brand-green": "#22C55E",
        // keep these if other screens use them
        "gold-accent": "#F7C948",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
      },
      boxShadow: {
        card: "0 6px 24px rgba(0,0,0,.06)",
      },
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
