/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy:        '#1a3a6b',
        'navy-deep': '#0f2347',
        sky:         '#b8d4f5',
        'sky-mid':   '#7aaee0',
        'sky-light': '#e6f1fb',
        'sky-pale':  '#f0f6fd',
        gold:        '#c9a84c',
        'gold-light':'#f0e6c8',
        cream:       '#faf8f3',
        'warm-white':'#fffef9',
        text:        '#1a1a2e',
        'text-mid':  '#4a5568',
        'text-soft': '#8a9bb0',
      },
      fontFamily: {
        playfair:  ['"Playfair Display"', 'serif'],
        cormorant: ['"Cormorant Garamond"', 'serif'],
        sans:      ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
