# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Language & Token Efficiency

When I write in Korean:
- Internally convert my Korean input to a concise English interpretation before processing
- Respond in English by default (shorter tokens)
- Keep responses minimal — no unnecessary explanation
- If I need Korean output, I will explicitly ask for it (한글로 답해줘)

# currentDate
Today's date is 2026-02-18.

## Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — TypeScript check + Vite production build (`tsc -b && vite build`)
- `npm run lint` — ESLint across the project
- `npm run preview` — Preview production build locally

## Architecture

React 19 + TypeScript + Vite SPA for **Objktt**, a record bar / cultural space website.

### Routing & Layout

- `main.tsx` wraps the app in `BrowserRouter`
- `App.tsx` wraps routes in `LanguageProvider` → `Layout` → `Routes`
- Pages: `/` (Home), `/about`, `/events`, `/contact`
- `Layout` provides fixed header (logo + nav + language/theme toggles) and footer, using the 12-column `GridSystem`

### Key Patterns

- **12-column grid system** (`GridSystem.tsx`): Wrapper component using CSS grid with `repeat(12, 1fr)`. Grid lines are rendered via background color gaps. Children get `--color-bg` background automatically via `cloneElement`.
- **i18n** (`LanguageContext.tsx` + `data/translations.ts`): React context providing `useLanguage()` hook. Supports `en`/`ko`. Language persisted to `localStorage` under key `objktt-language`. All UI strings accessed via `t.section.key`.
- **Theming**: Light/dark via `data-theme` attribute on `<html>`. CSS variables in `global.css` (`--color-bg`, `--color-text`, `--color-line`). Theme toggle is local state in `Layout` (not persisted).
- **3D scene** (`HeroScene.tsx`): React Three Fiber canvas with GLB models (`/public/models/`). All models use flat `MeshBasicMaterial` with brand color `#1119E9`. Models are draggable (`DragControls`) and float (`Float`).
- **Event posters** (`PosterStage.tsx` + `src/posters/*.js`): Dynamic poster scripts loaded via `import.meta.glob`. Each poster module exports `mount(container)` and optionally a cleanup function.
- **Events data** (`data/events.ts`): Static array of event objects with `script` field referencing poster JS files.

### Styling

- Global CSS only (`styles/global.css`), no CSS modules or CSS-in-JS
- Font: Google Sans
- Inline styles used extensively in components
- CSS variables for theming: `--color-bg`, `--color-text`, `--color-line`, `--color-accent`, `--header-height`

### External Services

- `@emailjs/browser` for contact form submission
- 3D: `@react-three/fiber` + `@react-three/drei` + `three`
- Animation: `framer-motion`
- Gestures: `@use-gesture/react`
