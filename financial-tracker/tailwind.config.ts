import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5A67D8',
          light: '#8B96E5',
          dark: '#4A54B3',
        },
        accent: {
          DEFAULT: '#FA8072',
          light: '#FFA599',
          dark: '#E5675A',
        },
        neutral: {
          white: '#FFFFFF',
          'light-gray': '#F7FAFC',
          'dark-charcoal': '#2D3748',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      fontSize: {
        'heading': '24px',
        'subheading': '18px',
        'body': '16px',
        'table': '14px',
        'label': '14px',
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      borderRadius: {
        button: '4px',
        input: '4px',
        card: '8px',
        label: '12px',
      },
      boxShadow: {
        card: '0 2px 4px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
