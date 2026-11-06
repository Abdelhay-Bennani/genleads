/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
      colors: {
        brand: { 50: '#eef4ff', 100: '#dbe6fe', 200: '#bfd3fe', 400: '#5b8def', 500: '#2f6bea', 600: '#1f55d1', 700: '#1a45a8' },
      },
    },
  },
  plugins: [],
}
