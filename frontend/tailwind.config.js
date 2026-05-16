/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2937",
        cloud: "#f7f5f1",
        paper: "#fffdf8",
        line: "#e7e2d8",
        accent: "#b7791f",
        accentSoft: "#fef3c7",
        roseSoft: "#ffe4e6",
        amberSoft: "#fef3c7"
      },
      boxShadow: {
        panel: "0 18px 40px rgba(36, 28, 21, 0.06)"
      }
    }
  },
  plugins: []
};
