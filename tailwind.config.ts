
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['var(--font-dm-sans)', 'sans-serif'],
        serif: ['var(--font-dm-serif)', 'serif'],
      },
      colors: {
        green: {
          50:  '#fbf8f2',
          100: '#e8dfd1',
          200: '#d8c8ad',
          400: '#c4a577',
          500: '#a77f52',
          600: '#7f5d3d',
          700: '#60462f',
          800: '#3f2f23',
        },
        stone: {
          50:  '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
      },
    },
  },
  plugins: [],
}

export default config
