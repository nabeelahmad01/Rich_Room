/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        'neon-cyan': 'var(--neon-cyan)',
        'neon-cyan-dark': 'var(--neon-cyan-dark)',
        'neon-purple': 'var(--neon-purple)',
        'neon-purple-light': 'var(--neon-purple-light)',
        'bg-deep': 'var(--bg-deep)',
        'bg-surface': 'var(--bg-surface)',
        'bg-card': 'var(--bg-card)',
        'chrome-border': 'var(--chrome-border)',
      },
      fontFamily: {
        heading: ['Outfit', 'var(--font-heading)', '"Plus Jakarta Sans"', 'sans-serif'],
        sub: ['"Plus Jakarta Sans"', 'var(--font-sub)', 'Outfit', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'var(--font-body)', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

