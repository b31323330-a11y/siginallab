/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        matlab: {
          blue: '#0076a8',
          darkBlue: '#00557f',
          orange: '#d9531e',
          yellow: '#edb120',
          purple: '#7e2f8e',
          green: '#77ac30',
          cyan: '#4dbeee',
          maroon: '#a2142f',
        }
      }
    },
  },
  plugins: [],
}

