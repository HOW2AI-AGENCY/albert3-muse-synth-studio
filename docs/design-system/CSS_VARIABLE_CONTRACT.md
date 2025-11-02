# 🔒 CSS Variable Contract - IMMUTABLE

⚠️ **CRITICAL**: Этот документ является контрактом между файлами.  
**НЕ ИЗМЕНЯЙТЕ** без обновления ВСЕХ связанных файлов!

## 🏗️ Architecture Decision

Albert3 Muse Synth Studio использует двухуровневую систему CSS переменных:

1. **`src/index.css`** - Единственный источник **базовых токенов** (spacing, colors, typography)
2. **`src/styles/design-tokens.css`** - **Density-специфичные токены** (compact/comfortable режимы)
3. **`tailwind.config.ts`** - Только **ссылки** на существующие переменные из `index.css`

---

## 📊 Variables Mapping

### ✅ DEFINED IN `src/index.css` ONLY:

#### Spacing Tokens (используются в Tailwind)
```css
--space-0: 0;
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.25rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-10: 2.5rem;
--space-12: 3rem;
--space-16: 4rem;
--space-20: 5rem;
--space-24: 6rem;
--space-32: 8rem;
--space-container: 1rem;
```

#### Font Size Tokens
```css
--font-size-2xs: 0.625rem;
--font-size-xs: 0.75rem;
--font-size-sm: 0.875rem;
--font-size-base: 1rem;
--font-size-lg: 1.125rem;
--font-size-xl: 1.25rem;
--font-size-2xl: 1.5rem;
--font-size-3xl: 1.875rem;
--font-size-4xl: 2.25rem;
--font-size-5xl: 3rem;
--font-size-6xl: 3.75rem;
--font-size-display: 4rem;
--font-size-heading: 2rem;
```

#### Color Palette (HSL triplets for Tailwind)
```css
--color-primary-50: 250 245 255;
--color-primary-100: 243 232 255;
--color-primary-200: 233 213 255;
--color-primary-300: 216 180 254;
--color-primary-400: 192 132 252;
--color-primary-500: 168 85 247;
--color-primary-600: 147 51 234;
--color-primary-700: 126 34 206;
--color-primary-800: 107 33 168;
--color-primary-900: 88 28 135;
--color-primary-950: 59 7 100;
```

#### Typography
```css
--font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', ...;
--font-family-mono: 'Monaco', 'Courier New', monospace;
--font-weight-thin: 100;
--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
--font-weight-extrabold: 800;
--font-weight-black: 900;
```

#### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-base: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
--shadow-glow: 0 0 40px hsl(var(--primary-glow) / 0.4);
--shadow-elegant: 0 10px 30px -10px hsl(var(--primary) / 0.3);
```

#### Z-index Layers
```css
--z-dropdown: 1000;
--z-sticky: 1020;
--z-fixed: 1030;
--z-modal-backdrop: 1040;
--z-modal: 1050;
--z-popover: 1060;
--z-tooltip: 1070;
--z-toast: 1080;
--z-maximum: 9999;
```

---

### ✅ DEFINED IN `src/styles/design-tokens.css` ONLY:

#### Density-specific Spacing
```css
/* Compact mode */
--space-compact-xs: 0.25rem;
--space-compact-sm: 0.5rem;
--space-compact-md: 0.75rem;
--space-compact-lg: 1rem;
--space-compact-xl: 1.5rem;

/* Comfortable mode */
--space-comfortable-xs: 0.5rem;
--space-comfortable-sm: 0.75rem;
--space-comfortable-md: 1rem;
--space-comfortable-lg: 1.5rem;
--space-comfortable-xl: 2rem;
```

#### Density-specific Control Heights
```css
--control-height-compact: 2rem;
--control-height-comfortable: 2.5rem;
```

---

## ❌ NEVER DUPLICATE

### 🚫 Forbidden Duplications

1. **Spacing tokens** (`--space-*`) MUST NOT be redefined in `design-tokens.css`
2. **Font tokens** (`--font-size-*`) MUST NOT be redefined in `design-tokens.css`
3. **Color tokens** (`--color-primary-*`) MUST NOT be redefined in `design-tokens.css`
4. **Shadow tokens** (except `--shadow-glow`, `--shadow-elegant`) MUST NOT be redefined in `design-tokens.css`

### ✅ Allowed Duplications

- **NONE**. Дубликаты переменных между `index.css` и `design-tokens.css` запрещены.

---

## 🔍 Validation Checklist

### Before ANY CSS changes:

- [ ] Read `docs/design-system/CSS_VARIABLE_CONTRACT.md` (this file)
- [ ] Verify no duplicates between `index.css` and `design-tokens.css`
- [ ] Ensure `tailwind.config.ts` only references existing vars from `index.css`
- [ ] Run `bash scripts/validate-css-contract.sh` to check for duplicates
- [ ] Test app on `/workspace/generate` route after changes

### How to Find Usage:

```bash
# Find all spacing variable usage
grep -r "var(--space-" src/

# Find all font size variable usage
grep -r "var(--font-size-" src/

# Find all color variable usage
grep -r "var(--color-primary-" src/
```

---

## 🛠️ How to Add New Variables

### Adding Base Tokens (spacing, colors, fonts):

1. Add to `src/index.css` inside `:root` block within `@layer base`
2. Reference in `tailwind.config.ts` if needed for Tailwind utilities
3. Update this contract document

### Adding Density Tokens (compact/comfortable):

1. Add to `src/styles/design-tokens.css`
2. Use in components via `var(--space-compact-*)` or `var(--space-comfortable-*)`
3. Update this contract document

---

## 📝 Examples

### ✅ CORRECT Usage:

```tsx
// Component using base spacing
<div className="p-4">  {/* Uses --space-4 from index.css via Tailwind */}
  <h1 className="text-2xl">Title</h1>  {/* Uses --font-size-2xl from index.css */}
</div>

// Component using density spacing
<div style={{ padding: 'var(--space-compact-md)' }}>
  Compact mode content
</div>
```

### ❌ INCORRECT Usage:

```css
/* design-tokens.css - WRONG! */
:root {
  --space-4: 1.2rem; /* ❌ Duplicate from index.css! */
  --font-size-xl: 1.3rem; /* ❌ Duplicate from index.css! */
}
```

---

## 🚨 Emergency: If You Broke the Contract

1. **DO NOT PANIC**
2. Run `bash scripts/validate-css-contract.sh` to identify duplicates
3. Remove duplicates from `design-tokens.css`
4. Verify app loads on `/workspace/generate`
5. Commit with message: `fix(css): remove duplicate CSS variables`

---

## 📚 Related Documentation

- [CONTRIBUTING.md](../../CONTRIBUTING.md) - CSS Changes Checklist
- [tailwind.config.ts](../../tailwind.config.ts) - Tailwind configuration
- [index.css](../../src/index.css) - Base CSS variables
- [design-tokens.css](../../src/styles/design-tokens.css) - Density tokens

---

**Last Updated**: 2025-11-02  
**Version**: 1.0.0  
**Status**: Active
