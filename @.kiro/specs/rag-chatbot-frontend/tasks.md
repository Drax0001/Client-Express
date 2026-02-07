# Frontend Redesign — Tasks

## Phase 0 — Discovery (2 days)

- Audit current UI pages and produce a bug list for horizontal overflow and responsiveness.
- Deliverable: short audit report with screenshots.

## Phase 1 — Tokens & Typography (1–2 days)

- Integrate two fonts (Poppins for headings, Inter for body) with local fallbacks; add `tokens.css`.
- Create color and spacing tokens as CSS variables.
- Acceptance: tokens file present, simple demo page rendering typography and color swatches.

## Phase 2 — Component Library (3–5 days)

- Build accessible `Header`, `Sidebar`, `Button`, `Input`, `Card`, `ChatPanel`, `Message`, and `Form` components.
- Use Hugeicons for primary icons; add an `Icon` wrapper component for consistent sizing.

## Phase 3 — Pages Migration (5–8 days)

- Redesign and migrate pages: Landing, Dashboard, Chat, Projects, Upload-Train, Settings, Upload flow, and any others.
- Fix all overflow bugs and implement responsive behavior per breakpoints.

## Phase 4 — Auth UI (2–3 days)

- Implement `Login` and `Signup` pages (UI-only) with client-side validation and placeholder social buttons.
- Provide mocked flows for local testing.

## Phase 5 — QA & Accessibility (2 days)

- Run automated accessibility checks (axe-core) and manual keyboard navigation tests.
- Cross-browser testing on Chrome, Firefox, Edge, and mobile Safari.

## Phase 6 — Documentation & Handoff (1 day)

- Add docs: how to use tokens, how to add a component, and style guidelines.

## Task list (granular)

- [ ] Audit and record all overflow/scrollbar issues
- [ ] Create `tokens.css` and integrate fonts
- [ ] Scaffold `Icon` wrapper with Hugeicons
- [ ] Implement `Header` and responsive `Sidebar`
- [ ] Implement Chat layout and composer
- [ ] Update Upload & Train pages with chunker visual feedback
- [ ] Implement Login/Signup UI
- [ ] Run accessibility and responsive QA
- [ ] Prepare PR with before/after screenshots and checklist

Estimates are rough; break tasks into smaller PRs to ease review.
