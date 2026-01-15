/** @type {import('tailwindcss').Config} */
export default {
    content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
  "./public/index.html",
],
    theme: {
        extend: {
            colors: {
                // "Scientific Institute" Palette
                background: "#ffffff",
                foreground: "#000000",
                primary: "#000000",
                "primary-foreground": "#ffffff",
                secondary: "#f3f4f6", // gray-100
                "secondary-foreground": "#111827", // gray-900
                muted: "#f3f4f6",
                "muted-foreground": "#6b7280", // gray-500
                accent: "#f3f4f6",
                "accent-foreground": "#111827",
                destructive: "#ef4444",
                "destructive-foreground": "#ffffff",
                border: "#e5e7eb", // gray-200
                input: "#e5e7eb",
                ring: "#000000",
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
