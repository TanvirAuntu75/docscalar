---
name: Warm Precision
colors:
  surface: '#fdf9f2'
  surface-dim: '#dddad3'
  surface-bright: '#fdf9f2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ec'
  surface-container: '#f1ede6'
  surface-container-high: '#ece8e1'
  surface-container-highest: '#e6e2db'
  on-surface: '#1c1c18'
  on-surface-variant: '#584237'
  inverse-surface: '#31302c'
  inverse-on-surface: '#f4f0e9'
  outline: '#8c7164'
  outline-variant: '#e0c0b1'
  surface-tint: '#9d4300'
  primary: '#9d4300'
  on-primary: '#ffffff'
  primary-container: '#f97316'
  on-primary-container: '#582200'
  inverse-primary: '#ffb690'
  secondary: '#625d59'
  on-secondary: '#ffffff'
  secondary-container: '#e6ded9'
  on-secondary-container: '#67625e'
  tertiary: '#006e2d'
  on-tertiary: '#ffffff'
  tertiary-container: '#2cb055'
  on-tertiary-container: '#003b15'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb690'
  on-primary-fixed: '#341100'
  on-primary-fixed-variant: '#783200'
  secondary-fixed: '#e9e1dc'
  secondary-fixed-dim: '#ccc5c0'
  on-secondary-fixed: '#1e1b18'
  on-secondary-fixed-variant: '#4a4642'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#fdf9f2'
  on-background: '#1c1c18'
  surface-variant: '#e6e2db'
typography:
  display-hero:
    fontFamily: Instrument Serif
    fontSize: 96px
    fontWeight: '400'
    lineHeight: '1.0'
    letterSpacing: -0.04em
  display-hero-mobile:
    fontFamily: Instrument Serif
    fontSize: 56px
    fontWeight: '400'
    lineHeight: '1.1'
  h1:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.02em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.02em
  button:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: '1.0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 96px
  5xl: 128px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style

This design system is built for a browser-based utility that feels more like a physical tool than a digital service. The brand personality blends the clinical efficiency of Swiss design with the warmth of high-end stationery. It targets professionals who value privacy and reliability, evoking an emotional response of focused calm and tactile satisfaction.

The aesthetic follows a **Warm Minimalist** movement:
- **Human-Centric Precision:** High-contrast, sharp typography paired with a soft, cream-based palette.
- **Physicality:** Elements should feel like they have weight and substance, using subtle shadows and deliberate border weights rather than digital-first trends like glassmorphism.
- **Functional Clarity:** Every interface element serves a purpose; decoration is found in the quality of the type and the balance of whitespace.

## Colors

The palette is anchored in organic, earthy tones to move away from the cold, blue-centric world of typical SaaS.

- **Foundational Surfaces:** The primary background uses a soft cream (`#FAF8F4`) to reduce eye strain, while panels use a deeper cream surface (`#F3EFE8`) to create subtle depth.
- **The Amber Core:** All interactive logic is driven by a singular amber accent. This color represents energy and conversion. It is the only "active" color in the interface besides success states.
- **The Ink Tones:** Typography is never pure black. Using warm "ink" tones maintains the premium, editorial feel of the document-centric experience.
- **Constraints:** Avoid all use of blue, purple, or synthetic gradients. Color should be applied functionally to guide the eye toward action.

## Typography

The typographic hierarchy relies on the tension between three distinct families:

1.  **Display (Instrument Serif):** Used sparingly for hero moments and large marketing headlines. It provides the "premium/human" character.
2.  **Interface (Inter):** The workhorse for the UI. Tight letter-spacing on headings ensures a compact, "Swiss" feel, while generous line-height on body text ensures legibility for long document lists or settings.
3.  **Technical (JetBrains Mono):** Reserved for file sizes, conversion formats, metadata, and labels. It signals the "precision" aspect of the app's utility.

**Scaling Note:** On mobile devices, the display hero font should scale down aggressively (to 56px) to maintain the editorial balance without breaking layout containers.

## Layout & Spacing

The design system employs a **Fixed Grid** philosophy for core application views to maintain a structured, tool-like appearance. 

- **The 8px Rhythm:** All spacing is a multiple of 8px. Use `16px` for internal component padding and `24px` for gutters between major layout sections.
- **Desktop Grid:** A 12-column grid with a maximum container width of 1200px. Content is centered.
- **Tablet/Mobile:** On smaller screens, the grid collapses to 4 columns with `16px` outer margins. 
- **Toolbars:** Navigation and toolbars should use the `48px` or `64px` spacing units for height to ensure a consistent vertical rhythm.

## Elevation & Depth

This design system uses depth to indicate hierarchy and interactive potential without relying on heavy gradients.

- **Foundational Layer:** The Primary Background (#FAF8F4) is the lowest level.
- **Surface Layer:** Cards and Panels sit on the background with a 1px border (#E8E0D8). They do not have shadows in their resting state.
- **Navigation Elevation:** The top navigation bar uses a subtle ambient shadow (`0 2px 16px rgba(0,0,0,0.06)`) to stay "above" the content.
- **Interactive State:** When a card is hovered, it gains an amber-tinted shadow (`0 8px 32px rgba(249,115,22,0.10)`) to signal focus.
- **Modals:** Use high-contrast depth with a significant blur (`0 24px 64px rgba(0,0,0,0.12)`) to completely isolate the task from the background application state.

## Shapes

The shape language balances structural rigidity with "friendly" approachable corners.

- **Control Elements:** Buttons and Inputs use a `10px` radius. This is soft enough to feel modern but sharp enough to retain a professional "tool" aesthetic.
- **Containers:** Cards and large panels use a `16px` radius to create a clear visual distinction from smaller elements.
- **Global Elements:** The main navigation bar and status badges use a "pill" shape (`100px`) to soften the overall interface and make these secondary items feel distinct from the primary work area.

## Components

### Buttons
- **Primary:** Background `#F97316`, Text `#FFFFFF`, 10px radius. On hover, background shifts to `#FDBA74`. On active/pressed, shifts to `#C2410C`.
- **Secondary:** Background `transparent`, Border 1px `#E8E0D8`, Text `#1A1714`. Hover adds a subtle `#F3EFE8` background fill.

### Input Fields
- Border 1px `#E8E0D8`, Background `#FFFFFF`, 10px radius.
- Placeholder text in `#9B8E89` (Ink-Ghost).
- On focus: Border becomes `#F97316` with a 2px outer ring.

### Cards & File Items
- Background `#F3EFE8`, Border 1px `#E8E0D8`, 16px radius.
- For file conversion lists, use `label-mono` for file extension badges (e.g., .PDF, .DOCX) centered in a pill-shaped container.

### Chips & Badges
- Used for status (e.g., "Converting", "Done").
- Background of Success state: `#16A34A` at 10% opacity with solid `#16A34A` text.
- 100px pill radius.

### Navigation Bar
- Floating or fixed top, white background or `#FAF8F4` with a subtle bottom shadow.
- Use 100px rounded containers for the entire bar to create a "capsule" look.

### Tooltips
- Dark Ink background (`#1A1714`), White text, JetBrains Mono font, 4px radius.