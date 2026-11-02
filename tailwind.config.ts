import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta quente e acolhedora (pós-parto, classe C/D, mobile)
        marca: {
          50: "#fdf2f4",
          100: "#fbe4e9",
          200: "#f7c9d4",
          300: "#f0a0b5",
          400: "#e67291",
          500: "#d94e73",
          600: "#c33660",
          700: "#a32750",
          800: "#882347",
          900: "#722140",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
