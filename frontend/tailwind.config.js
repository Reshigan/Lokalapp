/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { lg: '1024px', xl: '1140px', '2xl': '1240px' },
    },
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        // ----- Brand: Navy (the L) -----
        brand: {
          50:  '#EFF2FB',
          100: '#DBE2F6',
          200: '#B5C2EC',
          300: '#8696DA',
          400: '#5364BF',
          500: '#2F3F9D',
          600: '#243280',
          700: '#1E2D6E', // logo navy
          800: '#172253',
          900: '#0F1738',
        },
        // ----- Accent: Azure (the k) -----
        accent: {
          50:  '#EAF4FE',
          100: '#CFE5FB',
          200: '#A4CDF6',
          300: '#73B0EE',
          400: '#4791DD',
          500: '#2D7BCB', // logo azure
          600: '#1F62AB',
          700: '#184D88',
          800: '#143E6E',
          900: '#102E54',
        },
        // ----- Surface (neutral) -----
        surface: {
          DEFAULT: '#FFFFFF',
          bg:      '#F5F7FB',
          subtle:  '#EEF1F8',
          border:  '#E2E6F0',
          ring:    '#CBD3E2',
        },
        // ----- Text -----
        ink: {
          DEFAULT: '#0F1738',
          soft:    '#3F4763',
          muted:   '#7A8298',
          faint:   '#A6ADC0',
          invert:  '#FFFFFF',
        },
        // ----- Semantic -----
        success: { DEFAULT: '#10B981', soft: '#D1FAE5' },
        warning: { DEFAULT: '#F59E0B', soft: '#FEF3C7' },
        danger:  { DEFAULT: '#EF4444', soft: '#FEE2E2' },
      },
      borderRadius: {
        lg: '14px',
        md: '10px',
        sm: '6px',
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        soft:   '0 1px 2px 0 rgba(15,23,56,0.04), 0 1px 1px 0 rgba(15,23,56,0.03)',
        card:   '0 4px 16px -4px rgba(15,23,56,0.08), 0 2px 4px -1px rgba(15,23,56,0.04)',
        pop:    '0 12px 32px -8px rgba(15,23,56,0.18), 0 4px 8px -2px rgba(15,23,56,0.08)',
        'brand-glow': '0 8px 24px -8px rgba(30,45,110,0.40)',
        'accent-glow': '0 8px 24px -8px rgba(45,123,203,0.45)',
      },
      backgroundImage: {
        'brand-gradient':   'linear-gradient(135deg, #1E2D6E 0%, #2D7BCB 100%)',
        'brand-gradient-r': 'linear-gradient(90deg, #1E2D6E 0%, #2D7BCB 100%)',
        'brand-radial':     'radial-gradient(1200px circle at 0% 0%, rgba(45,123,203,0.10), transparent 50%), radial-gradient(900px circle at 100% 100%, rgba(30,45,110,0.08), transparent 50%)',
      },
      animation: {
        'fade-in':   'fadeIn 0.25s ease-out',
        'slide-up':  'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in':  'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn:   { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp:  { '0%': { transform: 'translateY(8px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        scaleIn:  { '0%': { transform: 'scale(0.97)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
    },
  },
  plugins: [],
};
