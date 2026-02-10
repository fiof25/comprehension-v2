/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'platform-blue': '#2563eb',
        'platform-gray': '#f3f4f6',
      },
      fontFamily: {
        'karla': ['Karla', 'sans-serif'],
        'mulish': ['Mulish', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
