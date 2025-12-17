/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0ea5e9",
        accent: "#22c55e",
        danger: "#ef4444",
      },
    },
  },
  plugins: [],
}
