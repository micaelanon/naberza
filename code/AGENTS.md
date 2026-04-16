<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# naBerza — Project Conventions

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript 5
- Vitest + @testing-library/react (with --legacy-peer-deps for React 19 compat)
- CSS custom properties (tokens) + BEM — no Tailwind, no CSS Modules
- localStorage primary store (Supabase integration pending auth)

## Folder structure
```
code/src/
├── app/
│   ├── (dashboard)/                 # Route group — main dashboard
│   │   ├── _components/             # Route-specific components (never routes)
│   │   │   └── [component-name]/
│   │   │       ├── __tests__/
│   │   │       ├── utils/
│   │   │       │   ├── types.ts     # Props always here, never inline
│   │   │       │   └── helpers.ts   # Pure functions (optional)
│   │   │       ├── [component-name].tsx
│   │   │       └── index.ts
│   │   ├── hooks/
│   │   │   └── use-[name]/          # Page-specific hooks
│   │   │       ├── __tests__/
│   │   │       ├── utils/
│   │   │       │   ├── types.ts
│   │   │       │   └── helpers.ts
│   │   │       ├── use-[name].ts
│   │   │       └── index.ts
│   │   ├── page.tsx                 # Orchestration only — no logic inline
│   │   └── page.css
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                     # Re-exports dashboard page
├── components/
│   └── ui/                          # Shared presentational components
│       └── shell/
├── lib/                             # Data layer, clients, utils
├── styles/
│   └── tokens.css                   # CSS custom properties — always use vars
└── types/                           # Shared TypeScript types
    └── dashboard.types.ts
```

## Naming
- Files/folders: `kebab-case`
- Components: `PascalCase`
- Hooks: `use-kebab-case` (folder) / `useCamelCase` (function)
- Types/Interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- CSS classes: BEM — `.block__element--modifier`

## Component rules
- Props **always** in `utils/types.ts`, never inline
- Every component folder has `index.ts` re-exporting the component
- Extract to hook when logic > 10–15 lines or has multiple useState/useEffect
- `useCallback` for all event handlers, `useMemo` for derived values
- Co-locate tests in `__tests__/` next to source

## CSS rules
- **Never** use hardcoded colour values — always `var(--token-name)`
- All tokens defined in `src/styles/tokens.css`
- BEM classes with `dashboard-page__` prefix for dashboard components
- Page CSS in `page.css` co-located with route

## Testing rules
- Test files: `__tests__/[file].test.ts(x)` co-located with source
- Pure helpers tested in isolation (no React needed)
- Component tests use `@testing-library/react` + `userEvent`
- Mocks: always `vi.hoisted()` before `vi.mock()`
- `throwSuggestions: true` — use semantic queries (getByRole > getByTestId)

## Import order
1. React / framework
2. Third-party
3. Internal `@/` aliases (absolute)
4. Relative `./` imports
5. Types (`import type`)
6. CSS (always last)

## What NOT to do
- No `../` up-traversal imports — use `@/`
- No logic in `page.tsx` — delegate to hooks and components
- No hardcoded colours in CSS
- No types inline in component files
- No `vi.fn()` directly inside `vi.mock()` — use `vi.hoisted()`
- No commits directly to `develop` or `main`
