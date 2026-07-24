/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'var(--color-border)',
        input: 'var(--color-input)',
        ring: 'var(--color-ring)',
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        navy: {
          DEFAULT: 'var(--color-navy)',
          muted: 'var(--color-navy-muted)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          muted: 'var(--color-surface-muted)',
          raised: 'var(--color-surface-raised)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
          muted: 'var(--color-primary-muted)',
          dark: 'var(--color-primary-dark)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        table: ['13px', { lineHeight: '1.35' }],
      },
      spacing: {
        rail: '56px',
        sidebar: '228px',
        topbar: '48px',
      },
      boxShadow: {
        panel: '0 1px 0 color-mix(in srgb, var(--color-navy) 6%, transparent)',
        crm: '0 1px 2px color-mix(in srgb, var(--color-navy) 6%, transparent), 0 4px 12px color-mix(in srgb, var(--color-navy) 4%, transparent)',
      },
    },
  },
  plugins: [],
};
