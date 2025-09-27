# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Stack: React + TypeScript + Vite
- Auth and data: Supabase (client in src/lib/supabase.ts)
- Linting: ESLint (flat config)
- Build: TypeScript project references + Vite
- Environment: Vite .env with VITE_ variables

Quickstart commands
- Install dependencies: npm install
- Start dev server: npm run dev
- Lint: npm run lint
- Build: npm run build
  - Runs TypeScript build (tsc -b) then Vite build
- Preview production build: npm run preview

Environment configuration
- Required vars (see .env.example):
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
- Create a .env.local file in the repo root with the above values before running the app. The app will throw at startup if these are missing (src/lib/supabase.ts).

Testing
- No test runner is configured in this repository at present (no vitest/jest setup). There is therefore no “single test” command.

Build and lint details
- TypeScript configs: tsconfig.json references tsconfig.app.json and tsconfig.node.json
  - tsconfig.app.json enables strict mode and enforces noUnusedLocals and noUnusedParameters. Any unused variables/parameters will cause tsc -b (and thus npm run build) to fail. Remove unused identifiers or prefix with _ to satisfy this.
  - tsconfig.node.json applies similar strictness to tooling files (e.g., vite.config.ts).
- ESLint: eslint.config.js uses @eslint/js, typescript-eslint, react-hooks, and react-refresh (Vite) presets. Lint the entire repo with: npm run lint

High-level architecture
1) Supabase client and types (src/lib/supabase.ts)
   - Initializes the Supabase client from VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
   - Exports typed interfaces mirroring the app’s tables: UserProfile, Article, Subscription, Notification. These types are reused across components for stronger typing.

2) Auth state and API (src/contexts/AuthContext.tsx)
   - Central auth provider that encapsulates Supabase auth state and exposes:
     - user, profile, session, loading
     - signUp(email, password, metadata?)
     - signIn(email, password)
     - signOut()
     - isAdmin() (based on profile.role === 'admin')
   - On mount: fetches initial session, derives user, and loads the user profile from the user_profiles table.
   - Subscribes to Supabase onAuthStateChange to reactively keep session, user, and profile in sync and to end loading state correctly.
   - All consumers should use useAuth() to access this state and methods.

3) User-facing surfaces
   - Auth (src/components/Auth.tsx)
     - Handles sign-in and sign-up flows via AuthContext API.
     - Validates basic password length for sign-up and provides lightweight message UX.
   - UserDashboard (src/components/UserDashboard.tsx)
     - Read-only view for users: shows latest published articles, subscription state, and notifications.
     - Data fetching:
       - Articles: public.articles, including author display_name/email via a user_profiles join.
       - Subscription: public.subscriptions row for current user.
       - Notifications: public.notifications filtered by user_id, joined to articles for titles.
     - Real-time updates via Supabase Realtime channels:
       - user_articles_changes: refreshes article list on any articles change filtered to published articles.
       - user_notifications_changes: refreshes notifications on user-specific changes.
     - RSS export: generates and downloads an RSS feed from the current articles using utils/rss.ts.
   - ArticleManager (src/components/ArticleManager.tsx)
     - Admin-only surface (guards on profile.role === 'admin').
     - CRUD for articles table with immediate refresh and a small delay after writes to ensure DB consistency.
     - Real-time subscription (articles_changes) triggers list refresh on any article change.
     - Supports toggling published state and deleting items.
     - Also provides RSS export limited to published articles.

4) RSS utilities (src/utils/rss.ts)
   - buildRssXml: constructs an RSS 2.0 XML string from Article[] with basic channel metadata.
   - downloadRssFile: client-side download via Blob/URL.
   - generateRssAndDownload: convenience wrapper combining the two; uses window.location.origin for link.

5) Vite and project wiring
   - vite.config.ts: React plugin with a minimal defineConfig.
   - Project references: tsconfig.json points to separate app/node configs; build uses tsc -b.
   - ESLint flat config ignores dist and applies recommended rule sets for TS and React hooks.

Operational notes for Warp
- Builds are type-strict. If a build fails, look for unused variables/parameters flagged by TS (noUnusedLocals/noUnusedParameters) and either remove them or prefix with _ when appropriate.
- Supabase env must be present at runtime. If the app crashes early with “Missing Supabase environment variables,” check .env.local or deployment env configuration.
- Real-time behavior depends on Supabase Realtime being enabled and tables (articles, notifications) configured appropriately in the backend. Frontend channels are named:
  - articles_changes (admin surface)
  - user_articles_changes and user_notifications_changes (user dashboard)

Key files
- package.json: scripts (dev, build, lint, preview) and dependencies
- eslint.config.js: ESLint flat config
- tsconfig.json, tsconfig.app.json, tsconfig.node.json: TS configuration and strictness
- vite.config.ts: Vite configuration
- .env.example: lists required Vite env vars for Supabase
- src/lib/supabase.ts: Supabase client and core types
- src/contexts/AuthContext.tsx: global auth state
- src/components/{Auth,UserDashboard,ArticleManager}.tsx: primary UI surfaces
- src/utils/rss.ts: helper for generating and downloading RSS
