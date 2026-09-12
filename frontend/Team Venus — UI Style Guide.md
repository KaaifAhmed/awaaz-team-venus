# Team Venus — UI Style Guide

## Design Direction
Clean, minimal, refined, and **Material Design 3–inspired**. Structure stays consistent; visual emotion adapts to the product.

## Layout & Spacing
- Use a strict **4px spacing system**: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64px`
- Prefer generous, consistent spacing over visual density.
- Use M3-style surfaces, containers, and subtle layering.

## Typography
Use a clear sans-serif typeface following the M3 hierarchy:

**Display → Headline → Title → Body → Label**

Use `sm / md / lg` variants consistently. Prioritize readability and clear hierarchy.

## Color
Use **semantic color roles**, never arbitrary hex values:

- `primary`
- `secondary`
- `tertiary`
- `background`
- `surface`
- `error`
- Corresponding `on-*` colors for text and icons.

Keep **no more than two accent colors** active on a screen.

## Components
- **Buttons:** Maximum two styles per screen — primary + secondary/ghost.
- **Icons:** Use **Material Symbols** consistently.
- **Forms:** Inline validation with specific, actionable errors.
- **Elevation:** Subtle M3 layering only; no decorative shadows.

## States
Every interactive component supports:

`Default · Hover · Focus/Active · Disabled · Loading · Error`

Data-driven screens must also handle:

`Loading · Populated · Empty · Error`

## Motion
- Functional and subtle.
- Transitions must be **≤200ms**.
- No decorative or unnecessary animation.

## Accessibility
- Text contrast: **≥ 4.5:1**
- Interactive targets: **≥ 44×44px**
- Always provide visible keyboard focus indicators.

## Avoid
- ❌ Background gradients
- ❌ Heavy shadows or textures
- ❌ Visual noise
- ❌ Skeuomorphic UI
- ❌ Excessive animation
- ❌ Unnecessary illustrations
- ❌ Arbitrary spacing/color values

**Design principle:**  
> **Simple structure. Strong hierarchy. Purposeful emotion.**