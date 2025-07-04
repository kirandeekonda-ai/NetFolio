# UI Design System Instructions

## 📌 Overview
This document provides clear guidance on how to consistently apply our minimalist design system across all UI/UX tasks. Use this document whenever designing or developing UI screens, components, or prototypes.

---

## 🎨 Color Usage Guidelines

Always import and reference colors from `colors.js`.

- **Primary Color (`primary`)**:
  - Usage: Main CTA buttons, links, headers.
- **Accent Color (`accent`)**:
  - Usage: Alerts, highlights, interactive elements.
- **Neutral Colors (`neutral`)**:
  - White: Backgrounds.
  - Light Gray: Cards, sections, table rows.
  - Dark Charcoal: Primary text.

**Example:**
```javascript
import { colors } from './colors';

button.style.backgroundColor = colors.primary;
```

## 🔤 Typography Application

Always follow typography standards defined in `typography.js`.

| Element | Font | Size | Weight |
|---------|------|------|---------|
| Headings | Inter | 24px | Bold |
| Subheadings | Inter | 18px | Semi-Bold |
| Body Text | Inter | 16px | Regular |
| Table Text | Roboto Mono | 14px | Regular |
| Labels/Button | Inter | 14px | Medium |

**Example Usage:**
```css
h1 {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  font-weight: 700;
}
```

## 📦 UI Components Implementation

Always reference styles and guidelines from `components.js`.

### Buttons:
- Rounded corners: 4px
- Padding: Vertical 8px, Horizontal 16px
- Hover state: Slight opacity decrease or darker shade

### Inputs:
- Rounded corners: 4px
- Padding: 8px vertical, 12px horizontal
- Border: Neutral gray (#E2E8F0)
- Focus border: Accent color

### Tables:
- Header: Neutral background (#F7FAFC)
- Alternating row colors: White and Light Gray
- Hover state: Neutral light gray background

### Cards:
- Padding: 16px
- Border radius: 8px
- Box-shadow: subtle shadow (rgba(0,0,0,0.05))

### Labels:
- Padding: 4px vertical, 8px horizontal
- Rounded corners: 12px radius
- Background: Subtle category colors or neutrals

## ✅ Best Practices

1. Always import colors, typography, and component styles explicitly from their respective design system files.
2. Maintain consistency in spacing, padding, and margins.
3. Prefer minimalism and simplicity over complexity.
4. Ensure interactive states (hover, active, focus) are clearly implemented as per guidelines.

---

**Note:** This design system is built for scalability and consistency. Always refer to the respective `.js` files for the most up-to-date values and implementations.
