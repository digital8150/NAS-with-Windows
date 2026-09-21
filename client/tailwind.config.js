/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#090d16',
          card: '#0f172a',
          surface: '#172033',
          border: '#1e293b',
          borderHover: '#334155',
          text: '#f8fafc',
          muted: '#94a3b8',
          accent: '#3b82f6'
        }
      }
    },
  },
  plugins: [],
}
