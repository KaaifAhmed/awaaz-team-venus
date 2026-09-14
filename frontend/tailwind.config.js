/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic Brand Tokens (Dynamic CSS variables)
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover:   'var(--color-primary-hover)',
          light:   'var(--color-primary-light)',
          on:      'var(--color-on-primary)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          light:   'var(--color-accent-light)',
        },
        // Surfaces, canvas, and borders
        surface: {
          DEFAULT: 'var(--color-surface)',
          hover:   'var(--color-surface-hover)',
          subtle:  'var(--color-surface-subtle)',
          border:  'var(--color-border)',
          'border-strong': 'var(--color-border-strong)',
        },
        'bg-app': 'var(--color-bg-app)',

        // Typography / Semantic text
        typography: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted:     'var(--color-text-muted)',
          subtle:    'var(--color-text-subtle)',
        },

        // Agency Identity Tokens
        agency: {
          kwsc:       'var(--color-agency-kwsc)',
          kmc:        'var(--color-agency-kmc)',
          sswmb:      'var(--color-agency-sswmb)',
          cantonment: 'var(--color-agency-cantonment)',
        },

        // Operational Hazard & Status Tokens
        hazard: {
          p0: {
            DEFAULT: 'var(--color-p0-hazard)',
            light:   'var(--color-p0-hazard-light)',
            border:  'var(--color-p0-hazard-border)',
          },
          p1: {
            DEFAULT: 'var(--color-p1-major)',
            light:   'var(--color-p1-major-light)',
            border:  'var(--color-p1-major-border)',
          },
          p2: {
            DEFAULT: 'var(--color-p2-routine)',
            light:   'var(--color-p2-routine-light)',
            border:  'var(--color-p2-routine-border)',
          },
        },
        status: {
          pending:    'var(--color-status-pending)',
          inProgress: 'var(--color-status-in-progress)',
          resolved:   'var(--color-status-resolved)',
        },
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
}
