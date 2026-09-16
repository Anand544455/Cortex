/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#2DD4BF',
          deep: '#0F9C8F',
          soft: '#E6FFFB',
        },
        navy: {
          DEFAULT: '#0B1E3D',
          light: '#132A52',
        },
        ink: '#05070A',
        slate: {
          DEFAULT: '#5B6B7C',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(11,30,61,0.06), 0 1px 2px rgba(11,30,61,0.04)',
        lift: '0 12px 32px -12px rgba(15,156,143,0.25)',
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
