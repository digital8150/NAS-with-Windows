/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', '"Helvetica Neue"', '"Segoe UI"', '"Apple SD Gothic Neo"', '"Noto Sans KR"', '"Malgun Gothic"', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#7F6DF2',
          hover: '#6855dd',
          pressed: '#6552D0',
          tint: '#F4F0F8',
          deep: '#4C3AB9'
        },
        sidebar: {
          bg: '#141416',
          surface: '#1c1c20',
          border: '#27272a',
          active: '#27223e',
          text: '#f4f4f5',
          muted: '#71717a'
        },
        notion: {
          canvas: '#FFFFFF',
          surface: '#F7F6F3',
          surfaceSoft: '#FAF9F7',
          hairline: '#E9E9E7',
          hairlineStrong: '#C4C4C0',
          ink: '#37352F',
          inkDeep: '#191919',
          slate: '#73726E',
          steel: '#9B9A97'
        }
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px'
      }
    },
  },
  plugins: [],
}
