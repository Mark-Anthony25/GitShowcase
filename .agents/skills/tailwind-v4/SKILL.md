---
name: tailwind-v4
description: Master Tailwind CSS v4 CSS-first configuration, @theme directives, custom utilities, @variant rules, @tailwindcss/vite integration, and coexistence with third-party CSS.
metadata:
  author: mark-anthony
  version: "1.0"
compatibility: Requires Tailwind CSS v4.x and Vite 6+
---

# Tailwind CSS v4 Engineering & Design Guide

This skill provides comprehensive instructions, architecture patterns, and migration rules for building modern web applications with **Tailwind CSS v4**.

---

## 1. Core Paradigm Shift in Tailwind v4

Tailwind CSS v4 is **CSS-first**, eliminating the need for `tailwind.config.js` or PostCSS in most projects.

### 1.1 CSS Entry Point
In v4, replace legacy `@tailwind base; @tailwind components; @tailwind utilities;` with a single direct import:

```css
/* src/index.css */
@import "tailwindcss";
```

### 1.2 Vite 6 Integration
Use the official `@tailwindcss/vite` plugin in `vite.config.ts`:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
});
```

---

## 2. Theme Customization via `@theme`

All design tokens (colors, fonts, breakpoints, spacing, shadows) are configured directly in CSS via the `@theme` directive using CSS variables.

### 2.1 Extending and Overriding Themes

```css
@import "tailwindcss";

@theme {
  /* Colors: defines bg-brand-primary, text-brand-primary, border-brand-primary */
  --color-brand-primary: #3b82f6;
  --color-brand-accent: #f59e0b;
  --color-paper-bg: #fcfbf7;
  --color-paper-card: #ffffff;
  --color-paper-border: #41403e;

  /* Typography: defines font-sans, font-mono, font-sketch */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --font-sketch: "Neucha", "Comic Sans MS", cursive;

  /* Custom Spacing / Sizing */
  --spacing-18: 4.5rem;
  --spacing-128: 32rem;

  /* Breakpoints */
  --breakpoint-xs: 30rem;
  --breakpoint-3xl: 120rem;

  /* Shadows */
  --shadow-paper: 2px 3px 0px 0px rgba(65, 64, 62, 0.9);
  --shadow-paper-lg: 4px 6px 0px 0px rgba(65, 64, 62, 0.9);
}
```

### 2.2 Dynamic CSS Variables & Dark Mode
Tailwind v4 maps theme values directly to CSS custom properties. You can re-assign theme variables at runtime or in dark mode:

```css
:root {
  --color-bg-canvas: #ffffff;
  --color-text-body: #1e293b;
}

[data-theme="dark"], .dark {
  --color-bg-canvas: #0f172a;
  --color-text-body: #f8fafc;
}
```

---

## 3. Custom Utilities, Variants, and Directives

### 3.1 Custom Utilities via `@utility`
Define bespoke utility classes that automatically participate in variant resolution (e.g. `hover:sketch-border`, `md:sketch-border`):

```css
@utility sketch-border {
  border: 2px solid var(--color-paper-border, #41403e);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
}

@utility shadow-hard {
  box-shadow: 3px 3px 0px 0px #41403e;
}
```

### 3.2 Custom Variants via `@custom-variant`
Create reusable custom selectors:

```css
@custom-variant pointer-fine (@media (pointer: fine));
@custom-variant paper-hover (&:hover:not(:disabled));
```

---

## 4. Coexistence with Third-Party CSS (e.g. PaperCSS)

When pairing Tailwind v4 with scoped or classless CSS frameworks like **PaperCSS**:

1. **Import Order Matters**:
   ```css
   /* 1. Base Framework */
   @import "papercss/dist/paper.min.css";

   /* 2. Tailwind Core */
   @import "tailwindcss";

   /* 3. Custom Overrides */
   @theme {
     --color-paper-border: #41403e;
   }
   ```
2. **Avoid Class Conflicts**:
   - PaperCSS uses classes like `.card`, `.btn`, `.badge`, `.row`, `.col`.
   - Prefer Tailwind utility composition (`flex flex-wrap`, `rounded-sm border-2`) or compose them gracefully.
   - If PaperCSS overrides utility margins or padding, use Tailwind's `!` modifier (e.g. `!p-4`, `!m-0`) or standard CSS layers.

---

## 5. Modern Best Practices & Anti-Patterns

| Category | Recommended (v4) | Avoid / Anti-Pattern (v3 Legacy) |
| :--- | :--- | :--- |
| **Config** | `@theme { --color-*: ... }` in CSS | `tailwind.config.js` |
| **Imports** | `@import "tailwindcss";` | `@tailwind base; @tailwind utilities;` |
| **Opacity** | `bg-blue-500/80` or `bg-[color:var(--my-color)]/50` | Hex + manual opacity calculation |
| **Container Queries** | `@container`, `@min-sm:...` (built-in) | `@tailwindcss/container-queries` plugin |
| **Transforms** | Direct `rotate-45`, `scale-105` | Legacy transform classes |
| **Dynamic classes** | Complete strings or `clsx('px-4', isPrimary && 'bg-blue-600')` | Interpolating partial classes `bg-${color}-500` |
