/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F766E',
          dark: '#115E59',
          light: '#2DD4BF',
        },
        accent: '#2DD4BF',
        bg: {
          light: '#E8F6F3',
          page: '#F9FAFB',
        },
        text: {
          dark: '#1F2933',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '18px',
        '2xl': '24px',
      },
      boxShadow: {
        'soft': '0 14px 30px rgba(0, 0, 0, 0.12)',
        'card': '0 20px 40px rgba(15, 118, 110, 0.15)',
      },
    },
  },
  plugins: [],
}
