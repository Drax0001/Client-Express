# Frontend Redesign — Design System & Component Specs

## Design Principles

- Minimal, calm, and functional.
- Flat colors, generous whitespace, and clear hierarchy.
- Purposeful iconography: use Hugeicons for primary UI glyphs; avoid decorative overuse.
- Typographic hierarchy to guide attention.

## Tokens

Color palette (example tokens)

- `--color-bg`: #0F1724 (dark mode base) / `--color-bg-light`: #FFFFFF (light mode base)
- `--color-primary`: #0B5FFF (bright, accessible blue)
- `--color-accent`: #16A34A (accent/positive)
- `--color-muted`: #6B7280 (muted text)
- `--color-surface`: #F8FAFC (cards) / `--color-surface-dark`: #0B1220

No gradients: rely on flat fills and subtle shadows.

Spacing scale

- `--space-xxs`: 4px
- `--space-xs`: 8px
- `--space-sm`: 12px
- `--space-md`: 16px
- `--space-lg`: 24px
- `--space-xl`: 32px

Border radius

- `--radius-sm`: 6px
- `--radius-md`: 12px
- `--radius-lg`: 16px

Typography

- Heading / Display font: Poppins (or Satoshi/Inter Display) — used for page headings and CTAs.
- Body font: Inter — used for paragraphs, inputs, and small UI labels.
- Scale: 14/16/20/28/40 for small/body/h3/h2/h1.

Iconography

- Use Hugeicons for primary actions (menu, search, send, upload, settings).
- Use monospace or subtle glyphs for code snippets.

Breakpoints

- Mobile: up to 639px (mobile-first)
- Tablet: 640px–1023px
- Desktop: 1024px–1439px
- Wide: 1440px+

Layout patterns

- Header (top) with logo, search, and account controls for narrow screens.
- Left rail (collapsible) on desktop for navigation; bottom nav for mobile where appropriate.
- Main content area should be scrollable; avoid fixed-width designs that cause overflow.

Component specs (high level)

- Header: compact, sticky, height 56px mobile / 72px desktop; accessible menu toggle.
- Sidebar: collapsible; width 72px (icons-only) collapsed / 280px expanded.
- Chat panel: two-column on desktop (sidebar + chat), single-column on mobile; keep messages vertically scrollable with sticky composer.
- Message bubble: max width 720px, responsive padding, clear role indicators (assistant/user/system).
- Buttons: primary (filled), secondary (ghost), destructive (outline red), with accessible focus states.
- Forms: labels above inputs, inline validation messages, large tap targets on mobile.

Wireframe placeholders

- Landing hero: left content + right placeholder image box 560x360.
- Login/signup: centered card with left illustration placeholder 320x240.

Accessibility notes

- Ensure contrast ratios meet AA.
- Use semantic HTML and ARIA where needed for complex widgets.
- Ensure focus states and skip links for keyboard users.

Deliverables

- `tokens.css` or `tokens.ts` with CSS variables.
- Component usage examples (React + Tailwind/CSS-in-JS snippets).
