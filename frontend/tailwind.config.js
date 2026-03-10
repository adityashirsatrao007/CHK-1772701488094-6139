import { nextui } from "@nextui-org/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FBF8F1", // Very soft cream parchment
        foreground: "#2D231F", // Deep rich mahogany brown
        court: {
          50: "#fdf8f5",
          100: "#f8eee7",
          200: "#eddace",
          300: "#dfbeac",
          400: "#cb9b81",
          500: "#b97b5e",
          600: "#a96449",
          700: "#8c4f39",
          800: "#744333",
          900: "#5d382b",
        },
        gold: {
          100: "#fdf6e3",
          200: "#faeab9",
          300: "#f5d985",
          400: "#E6C15D", // Primary shiny gold
          500: "#D4AF37", // Base metallic gold
          600: "#B8860B", // Dark goldenrod
          700: "#8a6205",
          800: "#604301",
          900: "#362400",
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Playfair Display", "serif"],
      },
      boxShadow: {
        'premium': '0 10px 40px -10px rgba(45, 35, 31, 0.15)',
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.3)',
      }
    },
  },
  darkMode: "class",
  plugins: [nextui()],
};
