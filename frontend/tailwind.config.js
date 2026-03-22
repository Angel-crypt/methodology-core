/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Verde Salvia (Teal) — acento primario · CTA · éxito
        sage: {
          50:  '#E1F5EE',
          100: '#C5EBE0',
          200: '#9DDFC8',
          300: '#78D4B3',
          400: '#5DCAA5',
          500: '#1D9E75',
          600: '#0F6E56',
          700: '#0B5A47',
          800: '#085041',
          900: '#053630',
        },
        // Lila Académico — rol Admin · énfasis
        purple: {
          50:  '#EEEDFE',
          100: '#DDDCFC',
          200: '#C8C5F9',
          300: '#ADA8EF',
          400: '#7F77DD',
          500: '#6860CE',
          600: '#534AB7',
          700: '#473EA0',
          800: '#3C3489',
          900: '#2A2465',
        },
        // Ámbar Cálido — advertencia · rol Prof. Aplicador
        amber: {
          50:  '#FAEEDA',
          100: '#F5DFB5',
          200: '#EDD090',
          300: '#E8BE68',
          400: '#EF9F27',
          500: '#BA7517',
          600: '#854F0B',
          700: '#6E420A',
          800: '#633806',
          900: '#4A2804',
        },
        // Coral Suave — error · inactivo
        coral: {
          50:  '#FCEBEB',
          100: '#F9D7D7',
          200: '#F4BABA',
          300: '#F2A8A8',
          400: '#F09595',
          500: '#D06060',
          600: '#A32D2D',
          700: '#8A2424',
          800: '#791F1F',
          900: '#5C1414',
        },
        // Grises cálidos (arena) — base neutral
        gray: {
          50:  '#F1EFE8',
          100: '#E8E6DF',
          200: '#D3D1C7',
          300: '#BFBDB5',
          400: '#888780',
          500: '#706F69',
          600: '#5F5E5A',
          700: '#4A4A46',
          800: '#3D3C38',
          900: '#2C2C2A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm:   '4px',
        md:   '8px',
        lg:   '12px',
        pill: '999px',
      },
      boxShadow: {
        focus: '0 0 0 3px rgba(93, 202, 165, 0.2)',
        sm: '0 1px 2px rgba(44,44,42,0.06), 0 1px 3px rgba(44,44,42,0.10)',
        md: '0 4px 6px rgba(44,44,42,0.07), 0 2px 4px rgba(44,44,42,0.06)',
        lg: '0 10px 15px rgba(44,44,42,0.08), 0 4px 6px rgba(44,44,42,0.05)',
      },
      transitionDuration: {
        fast:   '100ms',
        normal: '200ms',
        medium: '300ms',
      },
    },
  },
  safelist: [
    // Dynamic class names built via template literals or computed props
    // that Tailwind JIT cannot statically detect in content files
    { pattern: /^btn-/ },
    { pattern: /^badge-role-/ },
    { pattern: /^badge-status-/ },
    { pattern: /^toast-/ },
    { pattern: /^animate-/ },
  ],
  plugins: [],
}
