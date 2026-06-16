---
name: Lumina Doc
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#bbcbb5'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#859581'
  outline-variant: '#3c4b3a'
  surface-tint: '#25e452'
  primary: '#42f761'
  on-primary: '#00390c'
  primary-container: '#00d948'
  on-primary-container: '#005818'
  inverse-primary: '#006e20'
  secondary: '#ffb68b'
  on-secondary: '#522300'
  secondary-container: '#ff7f1c'
  on-secondary-container: '#602a00'
  tertiary: '#c3d9ff'
  on-tertiary: '#00315f'
  tertiary-container: '#93beff'
  on-tertiary-container: '#004c8e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6fff7b'
  primary-fixed-dim: '#25e452'
  on-primary-fixed: '#002205'
  on-primary-fixed-variant: '#005316'
  secondary-fixed: '#ffdbc8'
  secondary-fixed-dim: '#ffb68b'
  on-secondary-fixed: '#321200'
  on-secondary-fixed-variant: '#753400'
  tertiary-fixed: '#d5e3ff'
  tertiary-fixed-dim: '#a6c8ff'
  on-tertiary-fixed: '#001c3b'
  on-tertiary-fixed-variant: '#004786'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
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
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-desktop: 80px
  margin-mobile: 20px
  section-gap: 120px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is a sophisticated fusion of **Corporate Modern** and **Tactile 3D** aesthetics, specifically tailored for high-performance productivity tools. It targets professionals and enterprise users who require a tool that feels both technologically advanced and intuitively "physical."

The emotional response is one of **trust, efficiency, and magic**. By combining a deep, focused dark mode with hyper-realistic 3D document assets, the UI transforms mundane file conversion into a premium experience. The style leverages high-contrast typography and "glow-state" interactions to guide the user’s eye toward primary actions, while the inclusion of 3D objects adds a layer of depth and tangibility to abstract digital workflows.

## Colors

The color strategy is built on a "Void and Neon" principle. The foundation is a **deep black background** (`#050505`) which minimizes eye strain and allows content to float.

*   **Vibrant Green (#00D948):** Used for "Success" states, positive growth, and primary "Go" actions. It signifies the "Fast" and "Simple" nature of the product.
*   **Vibrant Orange (#FF7A00):** Used for high-energy emphasis, "Conversion" metaphors, and secondary calls to action.
*   **Accents:** Blue and Red are reserved strictly for document-type identification (Word/PDF) to maintain immediate visual recognition.
*   **Glows:** Primary and secondary colors should be used as subtle, low-opacity radial gradients (15-20% opacity) behind 3D assets and active buttons to create a "luminescent" effect.

## Typography

This design system uses a dual-font approach to balance personality with utility. 

**Plus Jakarta Sans** is the display typeface. Its geometric yet friendly curves excel in large-scale headlines, where tight letter-spacing and heavy weights convey a modern, premium feel. 

**Inter** handles the functional heavy lifting. Its high legibility and neutral tone are perfect for technical descriptions, file names, and UI labels. For dark mode optimization, body text should never be pure white; use a 90% opacity (Off-white) to prevent "halaction" or blurring on high-brightness screens.

## Layout & Spacing

The layout follows a **structured fluid grid** with generous vertical breathing room to accommodate large 3D assets.

*   **Desktop:** 12-column grid with 80px side margins. Key sections use a "Center-Weighted" layout where the primary 3D visual sits on the right or center, balanced by left-aligned text.
*   **Mobile:** 4-column grid with 20px side margins. 3D assets are scaled down and positioned above text headings to maintain a vertical story-telling flow.
*   **Rhythm:** An 8px base unit governs all internal component spacing, while section gaps are kept large (120px+) to create a cinematic sense of scale.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layering** and **Internal Glows** rather than traditional drop shadows.

1.  **Level 0 (Background):** Pure `#050505`—the canvas.
2.  **Level 1 (Cards/Containers):** Deep grey `#121212` with a 1px subtle border (`#ffffff1a`).
3.  **Level 2 (Interactive):** Surfaces that respond to hover with a subtle "Outer Glow" in the primary color.
4.  **Glassmorphism:** Navigation bars and tooltips use a 20px backdrop blur with a 40% opaque dark fill to maintain context of the underlying 3D visuals.

3D assets should appear to have "Physical Elevation," using soft contact shadows on the "floor" of the UI to ground them.

## Shapes

The shape language is consistently **Rounded (0.5rem base)** to mirror the soft edges of the 3D document icons. 

*   **Buttons:** Feature the standard 0.5rem radius, unless they are "Pill" style primary CTAs which use a fully rounded edge.
*   **Cards:** Use `rounded-xl` (1.5rem) to create a container that feels modern and approachable.
*   **Input Fields:** Follow the 0.5rem base to match the button geometry, ensuring a cohesive form-factor.

## Components

### Buttons
*   **Primary:** Solid Green (`#00D948`) or Orange (`#FF7A00`) with black text. Features a subtle inner-glow on hover.
*   **Secondary:** Ghost style with a 1px border. On hover, the border glows and the background fills with 10% opacity white.

### Cards & Feature Blocks
*   Feature cards should use a vertical stack: 3D Asset -> Headline -> Subtext.
*   Backgrounds should be `#121212` with a very subtle gradient from top-left to bottom-right to simulate light hitting a surface.

### Input Fields & Uploaders
*   The file uploader is the "hero" component. It should be a large, dashed-border area that transforms into a solid-glow container when a file is dragged over it.
*   Input fields use a dark fill with a 1px "Focus" border in the primary green.

### 3D Asset Integration
*   All document icons (PDF, DOCX) must share the same isometric angle and lighting source (Top-Left).
*   Use "floating" animations (subtle Y-axis translation) to give the UI a dynamic, living feel.