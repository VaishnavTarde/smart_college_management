/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    // darkMode: 'class', // Disabled for consistent light theme
    theme: {
        extend: {
            colors: {
                primary: {
                    light: '#4f46e5', // Indigo-600
                    DEFAULT: '#4338ca', // Indigo-700
                    dark: '#3730a3', // Indigo-800
                },
                secondary: {
                    light: '#f3f4f6', // Gray-100
                    DEFAULT: '#ffffff', // White
                    dark: '#1f2937', // Gray-800
                }
            }
        },
    },
    plugins: [],
}
