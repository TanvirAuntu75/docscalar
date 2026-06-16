/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "background": "var(--bg-primary)",
        "on-background": "var(--text-primary)",
        "primary": "var(--color-primary)",
        "on-primary": "var(--color-on-primary)",
        "primary-container": "var(--color-primary-container)",
        "on-primary-container": "var(--color-on-primary-container)",
        "secondary": "var(--color-secondary)",
        "on-secondary": "var(--color-on-secondary)",
        "secondary-container": "var(--color-secondary-container)",
        "on-secondary-container": "var(--color-on-secondary-container)",
        "tertiary": "var(--color-tertiary)",
        "on-tertiary": "var(--color-on-tertiary)",
        "tertiary-container": "var(--color-tertiary-container)",
        "on-tertiary-container": "var(--color-on-tertiary-container)",
        "error": "var(--color-error)",
        "on-error": "var(--color-on-error)",
        "error-container": "var(--color-error-container)",
        "on-error-container": "var(--color-on-error-container)",
        "surface": "var(--bg-secondary)",
        "on-surface": "var(--text-primary)",
        "surface-variant": "var(--bg-tertiary)",
        "on-surface-variant": "var(--text-secondary)",
        "outline": "var(--border-strong)",
        "outline-variant": "var(--border-medium)",
        "surface-dim": "var(--bg-primary)",
        "surface-bright": "var(--bg-card-hover)",
        "surface-container-lowest": "var(--bg-tertiary)",
        "surface-container-low": "var(--bg-secondary)",
        "surface-container": "var(--bg-card)",
        "surface-container-high": "var(--bg-card-hover)",
        "surface-container-highest": "var(--bg-card-hover)",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "base": "8px",
        "xs": "4px",
        "sm": "8px",
        "md": "16px",
        "lg": "24px",
        "xl": "32px",
        "2xl": "48px",
        "3xl": "64px",
        "4xl": "96px",
        "5xl": "128px",
        "container-max": "1200px",
        "margin-mobile": "16px",
        "gutter": "24px"
      },
      fontFamily: {
        "display-hero": ["var(--font-family-display)", "sans-serif"],
        "display-hero-mobile": ["var(--font-family-display)", "sans-serif"],
        "h1": ["var(--font-family-headings)", "sans-serif"],
        "h2": ["var(--font-family-headings)", "sans-serif"],
        "h3": ["var(--font-family-headings)", "sans-serif"],
        "body-lg": ["var(--font-family)", "sans-serif"],
        "body-md": ["var(--font-family)", "sans-serif"],
        "label-mono": ["JetBrains Mono", "monospace"],
        "button": ["var(--font-family)", "sans-serif"]
      },
      fontSize: {
        "display-hero": ["64px", { "lineHeight": "1.1", "letterSpacing": "-0.04em", "fontWeight": "800" }],
        "display-hero-mobile": ["40px", { "lineHeight": "1.2", "letterSpacing": "-0.02em", "fontWeight": "800" }],
        "h1": ["48px", { "lineHeight": "1.2", "letterSpacing": "-0.02em", "fontWeight": "600" }],
        "h2": ["32px", { "lineHeight": "1.3", "letterSpacing": "-0.02em", "fontWeight": "600" }],
        "h3": ["24px", { "lineHeight": "1.4", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "body-lg": ["18px", { "lineHeight": "1.6", "fontWeight": "400" }],
        "body-md": ["16px", { "lineHeight": "1.6", "fontWeight": "400" }],
        "label-mono": ["13px", { "lineHeight": "1.0", "letterSpacing": "0.02em", "fontWeight": "500" }],
        "button": ["15px", { "lineHeight": "1.0", "fontWeight": "600" }]
      }
    }
  },
  plugins: [],
}
