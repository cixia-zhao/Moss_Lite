/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#0b0c10",
          card: "#1f2833",
          cyan: "#66fcf1",
          blue: "#45a29e",
          purple: "#800080",
          pink: "#ff007f",
          green: "#39ff14",
          red: "#ff3131",
          text: "#c5c6c7"
        }
      },
      fontFamily: {
        mono: ["Share Tech Mono", "JetBrains Mono", "Fira Code", "monospace"],
        orbitron: ["Orbitron", "sans-serif"]
      }
    },
  },
  plugins: [],
}
