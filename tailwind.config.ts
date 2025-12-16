import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#308ce8',
        'background-light': '#f8f8f8',
        'background-dark': '#111921',
        'text-light-primary': '#1E1E1E',
        'text-dark-primary': '#ffffff',
        'text-light-secondary': '#888888',
        'text-dark-secondary': '#a0aec0',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        serif: ['var(--font-noto-serif-sc)', 'Noto Serif SC', 'serif'],
        logo: ['Bitcount Grid Single', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
export default config
