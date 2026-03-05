# Repository Guidelines

## Project Structure & Module Organization
- App source lives in `src/`.
- Route pages are in `src/pages/` (`Home.tsx`, `Menu.tsx`, `Events.tsx`, etc.).
- Reusable UI and scene logic are in `src/components/`.
- Shared state and utilities live in `src/contexts/`, `src/hooks/`, and `src/data/`.
- Poster scripts are in `src/posters/`; global styles are in `src/styles/global.css`.
- Static/public assets are in `public/` (notably `public/models/`), while source-managed assets are in `src/assets/`.
- Build output is generated to `dist/`.

## Build, Test, and Development Commands
- `npm run dev`: Start the Vite dev server with HMR.
- `npm run build`: Run TypeScript project checks and create a production build (`tsc -b && vite build`).
- `npm run preview`: Serve the built app locally for verification.
- `npm run lint`: Run ESLint across TypeScript/React files.

## Coding Style & Naming Conventions
- Language: TypeScript + React function components.
- Indentation: 2 spaces; keep formatting consistent with surrounding file style.
- Component and page files: `PascalCase` (for example, `PosterStage.tsx`).
- Hooks: `camelCase` with `use` prefix (for example, `useBreakpoint.ts`).
- Data/config modules: concise lowercase names (for example, `events.ts`, `translations.ts`).
- Keep shared theme tokens in CSS variables; avoid hardcoded duplicate colors when a variable exists.
- Run `npm run lint` before opening a PR.

## Testing Guidelines
- There is currently no dedicated test script or test framework configured.
- Minimum quality gate for contributions: `npm run lint && npm run build`.
- For new tests, prefer Vitest + React Testing Library and name files `*.test.ts(x)` next to the unit under test.

## Commit & Pull Request Guidelines
- Follow the repository’s existing commit style: `feat: ...`, `fix: ...` (Conventional Commit prefixes).
- Keep commits focused and scoped to one logical change.
- PRs should include:
  - What changed and why.
  - How to verify (`npm run lint`, `npm run build`, and manual page checks).
  - Screenshots/video for UI or animation changes.
  - Linked issue/task when applicable.
