---
name: MovieNet Architecture
description: Key decisions and quirks for the MovieNet movie/anime/sports discovery app
---

## Stack
- React + Vite frontend at `artifacts/movienet` (preview at `/`)
- Express 5 API server at `artifacts/api-server` (at `/api`)
- PostgreSQL via Drizzle ORM, pnpm monorepo
- Clerk auth (Replit-managed), Google + X OAuth

## TMDB Mock Fallback
`artifacts/api-server/src/lib/tmdb.ts` has rich hardcoded mock data for all endpoints that activates when `TMDB_API_KEY` is not set. The app works fully without the key using real TMDB poster URLs. When the user provides `TMDB_API_KEY`, live data flows automatically.

**Why:** The app must be demo-able before the user configures the API key.

## Generated API Client
All React Query hooks are in `lib/api-client-react/src/generated/api.ts`. When adding conditional fetches, always pass `queryKey` alongside `enabled`:
```ts
useGetMovie(id, { query: { enabled: !!id, queryKey: getGetMovieQueryKey(id) } })
```
This is required by the generated types — `enabled` alone causes TS error.

## DB Schema
`remindersTable` is in `lib/db/src/schema/reminders.ts`, exported via `lib/db/src/schema/index.ts`. The api-server references `@workspace/db` via tsconfig project references — after any schema change, run `pnpm run typecheck:libs` to rebuild declarations.

## Sports Data
`artifacts/api-server/src/lib/sports.ts` uses TheSportsDB free tier with hardcoded mock fallback. Sports news is always mock.

## Deployment Note
TMDB_API_KEY must be set as a secret for live movie/anime data. Without it, mock data with real TMDB poster images is served.
