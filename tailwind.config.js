/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        background: "#0A0A0A",
        foreground: "#F5F5DC",
        muted: {
          DEFAULT: "#DCD6C1",
          foreground: "#EDE9D5",
        },
        border: "#1A1A1A",
        input: "#1A1A1A",
        ring: "#1A1A1A",
        card: {
          DEFAULT: "#0A0A0A",
          foreground: "#F5F5DC",
        },
        popover: {
          DEFAULT: "#0A0A0A",
          foreground: "#F5F5DC",
        },
        primary: {
          DEFAULT: "#F5F5DC",
          foreground: "#0A0A0A",
        },
        secondary: {
          DEFAULT: "#DCD6C1",
          foreground: "#0A0A0A",
        },
        destructive: {
          DEFAULT: "#ff4444",
          foreground: "#F5F5DC",
        },
        muted: {
          DEFAULT: "#DCD6C1",
          foreground: "#0A0A0A",
        },
        accent: {
          DEFAULT: "#EDE9D5",
          foreground: "#0A0A0A",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
