# Fitnexa UI/UX Design System Specification

## 1. Brand Philosophy
Fitnexa is an enterprise-grade ERP designed for commercial Indian gym businesses. It conveys operational reliability, high financial precision, and institutional prestige.

---

## 2. Approved Color System

| Token | Hex Value | Semantic Usage |
| :--- | :--- | :--- |
| `navy-900` | `#0A192F` | Primary sidebar background, top brand chrome, primary button fill |
| `navy-800` | `#0F223D` | Table headers, secondary chrome, dark surfaces |
| `navy-700` | `#162E52` | Sidebar borders, hovered navigation items |
| `brandRed-700` | `#B91C1C` | Active navigation indicator, primary accent, alert badge |
| `brandRed-800` | `#991B1B` | Red button hover state, critical danger actions |
| `canvas-base` | `#FBFBF9` | Primary application canvas background (warm off-white) |
| `canvas-surface` | `#F5F5F0` | Card background, input background, subtle panel fill |
| `canvas-subtle` | `#EFEFEA` | Skeleton loader base, hovered table row |
| `neutral-primary`| `#111827` | Primary typography (high contrast) |
| `neutral-muted` | `#6B7280` | Secondary typography, metadata, subtitles |
| `border-subtle` | `#E5E7EB` | Structural dividers, card borders, table grid lines |

---

## 3. Strict Typography Rules
- **Approved Primary Font**: `Plus Jakarta Sans` with fallback to system sans stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- **Strictly Prohibited Fonts**: *Inter, Geist, Space Grotesk*.
- Monospace font (`font-mono`) reserved for currency figures, latency readings, timestamps, and UUID identifiers.

---

## 4. Strictly Prohibited Visual Patterns
1. 🚫 **No pure white (`#FFFFFF`) backgrounds**: Always utilize warm off-white `#FBFBF9`.
2. 🚫 **No Lucide icons**: Utilize custom SVGs or Radix UI headless icons.
3. 🚫 **No harsh gradients, radial orbs, or dot grids**.
4. 🚫 **No drop shadows**: Use crisp 1px borders (`border border-[#E5E7EB]`).
5. 🚫 **No three feature cards in a row**: Standardize on 2 or 4 columns.
6. 🚫 **No emojis** anywhere in the interface or error messages.
7. 🚫 **No liquid glass / glassmorphism**.
8. 🚫 **No em dashes (`—`)** in user-facing copy.
9. 🚫 **No rounded pill buttons**: Corners must be sharp or minimally rounded (`rounded-sm` or `rounded-none`).
10. 🚫 **No hover bounce / scale animations**: Respect `prefers-reduced-motion` at all times.

---

## 5. Component Standards
- **Buttons**: Sharp or minimally rounded (`rounded-sm`), prominent keyboard focus rings (`focus-visible:outline-2`), loading spinners on active states.
- **Tables**: Clear contrast headers (`#0F223D`), clean 1px row dividers, alternating row tints, right-aligned numeric data.
- **Dialogs / Modals**: Radix UI primitives, warm off-white surface, sharp borders, ESC key dismissal, focus trap, no drop shadows.
- **Loading**: Pulse skeletons matching canvas subtle color (`#EFEFEA`), never blank screens.
