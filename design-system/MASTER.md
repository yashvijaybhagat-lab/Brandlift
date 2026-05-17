# BrandLift Design System — MASTER

> A premium, dark-mode-first design system for BrandLift: a small business digital presence platform targeting busy, skeptical owners. Every decision prioritizes trust, warmth, and effortlessness over techiness.

---

## 1. Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `brand-bg` | `#0A0A0B` | App background — near-black, warmer than pure black |
| `brand-surface` | `#111113` | Card backgrounds, panels |
| `brand-surface-elevated` | `#18181C` | Elevated cards, sidebars, dropdowns |
| `brand-border` | `rgba(255,255,255,0.06)` | Subtle dividers, default card borders |
| `brand-border-strong` | `rgba(255,255,255,0.12)` | Focus rings, emphasized dividers |
| `brand-primary` | `#F5A623` | Primary CTA — warm amber: trustworthy, energetic, not techy blue |
| `brand-primary-hover` | `#F0941A` | Hover state for primary |
| `brand-primary-muted` | `rgba(245,166,35,0.12)` | Primary tint backgrounds, selected states |
| `brand-accent` | `#E8825C` | Secondary actions, warm coral |
| `brand-text` | `#FAFAFA` | Primary text |
| `brand-text-secondary` | `#A1A1AA` | Supporting text, captions |
| `brand-text-muted` | `#71717A` | Placeholder text, disabled labels |
| `brand-success` | `#4ADE80` | Positive states |
| `brand-warning` | `#FBBF24` | Warning states |
| `brand-error` | `#F87171` | Error states |

### Hero Gradient
```css
background: linear-gradient(135deg, #0A0A0B 0%, #111113 50%, #18181C 100%);
```

### Rationale
Amber was chosen over the clichéd techy blue because it signals warmth, trust, and energy — qualities small business owners relate to. Coral accent adds approachability without competing with the primary CTA.

---

## 2. Typography

### Font Family
**Inter** — clear, legible, professional.
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Weights
| Weight | Usage |
|--------|-------|
| `400` | Body copy, descriptions |
| `500` | Headings, labels, buttons, emphasized text |

**Never use 600 or 700.** The medium weight with generous letter spacing achieves the same visual weight without feeling heavy.

### Type Scale
| Size | px | Typical use |
|------|-----|-------------|
| `text-xs` | 12px | Badges, captions, metadata |
| `text-sm` | 14px | Secondary body, table cells |
| `text-base` | 16px | Primary body copy |
| `text-xl` | 20px | Card headings, sub-section titles |
| `text-2xl` | 24px | Section headings |
| `text-3xl` | 32px | Page headings |
| `text-5xl` | 48px | Hero sub-headlines |
| `text-6xl` | 64px | Hero headlines |

### Line Heights
- Body: `1.6` — generous for readability
- Headings: `1.2` — tight for visual impact

### Letter Spacing
- Headings 24px+: `-0.02em` — prevents Inter from feeling too wide at large sizes

---

## 3. Spacing

Base unit: **8px**

| Token | Value |
|-------|-------|
| `space-1` (8px) | Tight internal padding |
| `space-2` (16px) | Standard internal padding |
| `space-3` (24px) | Component gaps |
| `space-4` (32px) | Section gaps |
| `space-5` (40px) | Large section gaps |
| `space-6` (48px) | Section dividers |
| `space-8` (64px) | Page section spacing |
| `space-10` (80px) | Large page spacing |
| `space-12` (96px) | Hero spacing |
| `space-16` (128px) | Page hero spacing |

---

## 4. Border Radius

| Context | Radius |
|---------|--------|
| Interactive elements (buttons, inputs) | `8px` |
| Cards, containers | `12px` |
| Large containers, modals | `16px` |
| Pills, badges, tags | `24px` |

---

## 5. Borders

- Default: `0.5px solid rgba(255,255,255,0.06)`
- Strong: `1px solid rgba(255,255,255,0.12)`

Use hairline 0.5px borders by default — they feel premium and high-resolution. Use 1px only for intentional emphasis.

---

## 6. Animation & Motion

### Easing Curves (Emil-style)

| Name | Curve | Duration |
|------|-------|----------|
| Enter | `cubic-bezier(0.23, 1, 0.32, 1)` | 250–280ms |
| Exit | `cubic-bezier(0.23, 1, 0.32, 1)` | 180–220ms |
| Movement | `cubic-bezier(0.77, 0, 0.175, 1)` | 200–300ms |
| Press | `scale(0.97)` | 130ms |
| Card hover | `translateY(-2px)` | 160ms |

### Principles
- **Enter animations** start from `opacity: 0, translateY(6px)` — subtle, never dramatic
- **Exit** is always faster than enter
- **Press feedback** is instant (130ms) — feels mechanical, responsive
- **Card hover** lifts slightly — communicates interactivity without being gimmicky
- **Skeleton loading** uses shimmer, never spinners
- `prefers-reduced-motion`: all transforms collapse to opacity-only fades

### CSS Variables
```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.23, 1, 0.32, 1);
```

---

## 7. Component Conventions

### Buttons
- **Primary**: Amber gradient background, white text, weight 500
- **Secondary**: Surface background, 0.5px border, text-secondary
- **Ghost**: Transparent, text-secondary, border on hover
- **Danger**: Error color tint background
- Loading state: animated dots (···) — never says "loading", never shows a spinner
- All buttons scale `0.97` on `:active` — 130ms

### Cards
- Background: `#111113` (surface) or `#18181C` (elevated)
- Border: `0.5px solid rgba(255,255,255,0.06)`
- Border radius: `12px`
- Optional hover: `translateY(-2px)`, 160ms

### Inputs
- Background: surface color
- Default border: 0.5px brand-border
- Focus: amber border + subtle amber glow via `box-shadow`
- Error: red border + shake animation + fade-in error message

### Badges
- Platform-specific colors (TikTok: black, Instagram: gradient-pink, YouTube: red, Website: surface, Google: blue)
- 24px border radius (pill)
- 12px text, weight 500

---

## 8. Accessibility

- Focus rings always present — `box-shadow` based, never `outline: none` without replacement
- Color contrast: all text-on-background combinations meet WCAG AA minimum
- `prefers-reduced-motion` respected — transforms removed, fades kept
- Interactive elements have minimum 44×44px touch target (via padding)

---

## 9. Voice & Tone (UI Copy)

BrandLift serves busy, skeptical small business owners. Copy should:
- Be **direct** — no fluff, no marketing speak
- Use **confident** language, not tentative ("your posts" not "your posts might")
- **Never say "loading"** — show progress visually
- **Action-first** button labels: "Generate post" not "Click to generate a post"
- **Numbers over adjectives**: "3 posts ready" not "several posts ready"
- **Acknowledge the pain**: "Built for people who don't have 3 hours to spare"

---

## 10. Platform Colors (for Badges)

| Platform | Color |
|----------|-------|
| TikTok | `#000000` with white text |
| Instagram | `#E1306C` (rose) |
| YouTube | `#FF0000` |
| Website | `#18181C` (surface-elevated) with amber border |
| Google | `#4285F4` |
