/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"JetBrains Mono"', 'monospace'],
                display: ['Oswald', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            colors: {
                zinc: {
                    950: '#0a0a0a',
                    900: '#121212',
                    800: '#1e1e1e',
                }
            }
        },
    },
    plugins: [],
}