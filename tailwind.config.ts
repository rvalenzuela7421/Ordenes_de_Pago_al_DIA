import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Colores oficiales Seguros Bolívar
        primary: {
          50: '#f0f9f4',    // Verde muy claro
          100: '#dcfce7',   // Verde claro
          200: '#bbf7d0',   // Verde suave
          300: '#86efac',   // Verde medio-claro
          400: '#4ade80',   // Verde medio
          500: '#22c55e',   // Verde estándar
          600: '#008457',   // Verde Bolívar principal
          700: '#006d47',   // Verde Bolívar oscuro
          800: '#005a39',   // Verde muy oscuro
          900: '#00472b',   // Verde profundo
        },
        bolivar: {
          // Verde institucional (color principal)
          green: '#008457',       // Verde principal institucional
          'green-dark': '#006d47', // Verde oscuro para hover
          'green-light': '#99B24F', // Verde claro complementario
          'green-bg': '#f0f9f4',   // Verde muy claro para fondos
          
          // Amarillo institucional (color secundario)
          yellow: '#FFD046',      // Amarillo institucional
          'yellow-dark': '#F6C343', // Amarillo más oscuro
          'yellow-light': '#FFF8E1', // Amarillo muy claro para fondos
          
          // Neutros oficiales
          gray: '#B4B5B7',        // Gris suave oficial
          'gray-dark': '#374151',  // Gris oscuro para textos
          'gray-light': '#F9FAFB', // Gris muy claro para fondos
          'gray-border': '#E5E7EB', // Gris para bordes
          white: '#FFFFFF',       // Blanco puro (60% de la paleta)
          black: '#000000',       // Negro para textos principales
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
    },
  },
  plugins: [],
}

export default config
