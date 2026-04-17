import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        surface: { DEFAULT: '#0a0a0a', alt: '#111111' },
        accent: { DEFAULT: '#2121de', hover: '#3333ff', glow: 'rgba(33,33,222,0.3)' },
        dim: '#555555',
        muted: '#888888',
        gold: '#ffaa00',
        success: '#2ecc71',
        danger: '#ff4444',
      },
      fontFamily: {
        arcade: ["'Press Start 2P'", "'Courier New'", 'monospace'],
      },
      borderColor: {
        line: '#1a1a1a',
        'accent-blue': '#2121de',
      },
    },
  },
  plugins: [],
};

export default config;
