import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060E1A',
          900: '#0A192F',
          800: '#0F223D',
          700: '#162E52',
          600: '#1E3C68',
        },
        brandRed: {
          900: '#7F1D1D',
          800: '#991B1B',
          700: '#B91C1C',
          600: '#DC2626',
          500: '#EF4444',
        },
        canvas: {
          base: '#FBFBF9',
          surface: '#F5F5F0',
          subtle: '#EFEFEA',
        },
        neutralText: {
          primary: '#111827',
          secondary: '#374151',
          muted: '#6B7280',
          disabled: '#9CA3AF',
        },
        borderNeutral: {
          subtle: '#E5E7EB',
          medium: '#D1D5DB',
          strong: '#9CA3AF',
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
        DEFAULT: '3px',
        md: '4px',
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
};

export default config;
