/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#080C14',
          900: '#0D1520',
          800: '#111D2E',
          700: '#162440',
        },
        pathlight: {
          400: '#00E5CC',
          500: '#00C9B1',
          600: '#00A896',
        },
        ember: {
          400: '#FFB347',
          500: '#FF9500',
          600: '#E08000',
        },
        lime: {
          400: '#C8FF57',
        },
        danger: {
          400: '#FF4D4D',
        },
      },
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow':      'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up':         'fadeUp 0.5s ease-out forwards',
        'fade-down':       'fadeDown 0.5s ease-out forwards',
        'slide-in-right':  'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-right':     'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-left':      'slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'bounce-in':       'bounceIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer':         'shimmer 1.5s infinite',
        'breathe':         'breathe 3s ease-in-out infinite',
        'scan':            'scanLine 1.8s linear infinite',
        'gradient-rotate': 'gradientRotate 4s linear infinite',
        'ping-slow':       'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'spin-slow':       'spin 3s linear infinite',
        'type-in':         'typeIn 0.6s steps(20) forwards',
        'glow':            'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeDown: {
          '0%':   { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceIn: {
          '0%':   { opacity: '0', transform: 'scale(0.85)' },
          '60%':  { opacity: '1', transform: 'scale(1.05)' },
          '80%':  { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200px 0' },
          '100%': { backgroundPosition: 'calc(200px + 100%) 0' },
        },
        breathe: {
          '0%,100%': { opacity: '0.1' },
          '50%':     { opacity: '0.25' },
        },
        scanLine: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100vw)' },
        },
        gradientRotate: {
          '0%':   { '--angle': '0deg' },
          '100%': { '--angle': '360deg' },
        },
        typeIn: {
          '0%':   { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0% 0 0)' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 8px rgba(0, 229, 204, 0.3)' },
          '100%': { boxShadow: '0 0 24px rgba(0, 229, 204, 0.7)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      boxShadow: {
        'teal-sm':  '0 0 12px rgba(0,229,204,0.3)',
        'teal-md':  '0 0 24px rgba(0,229,204,0.5)',
        'teal-lg':  '0 0 48px rgba(0,229,204,0.4)',
        'amber-sm': '0 0 12px rgba(255,179,71,0.3)',
        'glass':    '0 4px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.05) inset',
      },
      backdropBlur: {
        xs:  '2px',
        sm:  '8px',
        md:  '16px',
        lg:  '24px',
        xl:  '40px',
      },
    },
  },
  plugins: [],
};
