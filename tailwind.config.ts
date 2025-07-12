import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'bg-red-100', 'text-red-800',
    'bg-orange-100', 'text-orange-800',
    'bg-yellow-100', 'text-yellow-800',
    'bg-pink-100', 'text-pink-800',
    'bg-purple-100', 'text-purple-800',
    'bg-green-100', 'text-green-800',
    'bg-blue-100', 'text-blue-800',
    'bg-teal-100', 'text-teal-800',
    'bg-cyan-100', 'text-cyan-800',
    'bg-gray-200', 'text-gray-800',
    'bg-gray-100', 'text-gray-600',
    'bg-indigo-100', 'text-indigo-800',
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
