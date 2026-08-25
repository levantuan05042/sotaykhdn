/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'agri-red': '#A62026',
        'agri-light': '#FEEBEB',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Thêm dòng này để nhận font Inter toàn hệ thống
      },
    },
  },
  plugins: [],
}