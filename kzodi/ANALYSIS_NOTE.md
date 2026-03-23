# KZodi Project Analysis Note

## 1. What this project is
KZodi is a `Next.js 16` full-stack web app with a companion `Capacitor` Android shell. It combines:

- astrology and MBTI reading flows
- Google login via `next-auth`
- an AI chat app with roleplay characters
- user-created characters and stories
- memory/RAG using `Pinecone`
- message and character persistence in `PostgreSQL`
- caching and some profile/conversation acceleration via `Redis/Valkey`
- multilingual generation with heavy emphasis on Burmese support

The actual app code lives inside the nested [`kzodi/`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi) folder.

## 2. Main stack
- Frontend: `Next.js App Router`, `React 19`, `framer-motion`, `zustand`
- Auth: `next-auth@5 beta` + `@auth/pg-adapter` + Google OAuth
- Database: `pg` against Aiven Postgres
- Cache/state infra: `ioredis` against Valkey/Redis
- AI providers:
  - Groq
  - xAI
  - Fireworks
  - Gemini OpenAI-compatible endpoint
- Vector memory: `@pinecone-database/pinecone`
- Mobile wrapper: `Capacitor`
- PWA: `@ducanh2912/next-pwa`

## 3. Project layout
- [`src/app`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/app): App Router pages and API routes
- [`src/components`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/components): UI for landing, form flow, results, and chat app
- [`src/lib`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/lib): DB, Redis, AI client, search, tarot, store logic
- [`src/lib/ai-engine`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/lib/ai-engine): roleplay "brain + heart" orchestration pipeline
- [`src/data`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/data): seeded characters, MBTI questions, stickers
- [`scripts`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/scripts): DB seeding, migrations, fix scripts, test scripts
- [`android`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/android): Capacitor Android project
- [`public`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/public): tarot assets, icons, manifests

## 4. Primary user flows
### Astrology landing and reading flow
- Home page at [`src/app/page.tsx`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/app/page.tsx) decides between marketing landing and chat landing.
- The app can redirect authenticated users directly to `/chat`.
- Reading-related APIs store results and feedback into Postgres tables like `readings` and `feedbacks`.

### Chat app
- `/chat` loads [`ChatApp.tsx`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/components/chat-app/ChatApp.tsx).
- It manages four main tabs: `explore`, `chats`, `create`, `profile`.
- It syncs conversations from the server, merges persisted and local state, handles deep links, birthday greetings, and native back button behavior.
- State is managed via Zustand stores in `src/lib/store.ts`, `src/lib/chatStore.ts`, and related helpers.

### Character creation and discovery
- Public and user-created characters are served by [`src/app/api/characters/route.ts`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/app/api/characters/route.ts).
- Characters are ranked by a simple trending score: `likes_count * 2 + msg_count`.
- Users can create/update characters; public discovery only shows `visibility = 'public'`.

### Roleplay and memory
- [`src/app/api/roleplay/route.ts`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/app/api/roleplay/route.ts) is the most complex API route.
- It authenticates the user, loads profile context, retrieves Pinecone memory, optionally enriches lore/current facts, runs the AI engine, sanitizes stickers/output, applies cooldown rules, and stores conversation memory again.
- This route is the center of the live chat experience.

## 5. Important API surface
Observed API routes include:

- `/api/analyze`
- `/api/chat`
- `/api/roleplay`
- `/api/voice`
- `/api/translate`
- `/api/characters`
- `/api/characters/[id]`
- `/api/characters/[id]/like`
- `/api/conversations`
- `/api/messages`
- `/api/stories`
- `/api/sticker`
- `/api/sticker/packs`
- `/api/memory`
- `/api/rag`
- `/api/user/profile`
- `/api/user/language`
- `/api/user/reading`
- `/api/user/link-reading`
- `/api/feedback`
- `/api/feedback/aggregate`
- `/api/auth/[...nextauth]`

## 6. Data and persistence model
### PostgreSQL
The DB bootstrap logic is in [`src/lib/db.ts`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/lib/db.ts). It:

- creates `users`, `accounts`, `sessions`, `verification_token` for NextAuth
- creates app tables like `feedbacks`, `readings`, `messages`, `stories`, `conversation_metadata`, `user_stickers`, `characters`, `character_likes`
- creates indexes for character discovery and message retrieval
- applies lightweight schema migration steps on startup

This means the app can self-heal some schema gaps, but it still assumes the Postgres instance is reachable.

### Redis / Valkey
[`src/lib/redis.ts`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/lib/redis.ts) creates a shared `ioredis` client. It is used for:

- caching character lists
- caching user profile fragments
- some chat/session acceleration

### Pinecone
Pinecone is used as a long-term memory store for roleplay interactions. The roleplay route:

- embeds user/character interactions
- retrieves top-K relevant memories
- saves important user facts back into Pinecone

## 7. AI architecture
### Central provider abstraction
[`src/lib/groq.ts`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/lib/groq.ts) is really a multi-provider AI client, despite the filename. It provides:

- Groq key pooling and load distribution
- retry and rate-limit rotation
- request queueing
- token-per-minute tracking
- response caching
- fallback between providers

### Roleplay engine
[`src/lib/ai-engine/index.ts`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/lib/ai-engine/index.ts) orchestrates:

1. `heart` phase for local emotional analysis
2. `brain` phase for reasoning and reply strategy
3. final generation phase using provider-specific model routing
4. post-processing and timing metadata

Notable behavior:
- Burmese output prefers Gemini for final generation
- English roleplay tends to use `llama-3.3-70b-versatile`
- Kimi K2 is used broadly for reasoning
- fallback logic is baked into the provider layer

### Search and enrichment
`src/lib/search.ts` combines Exa and Tavily for external search. Tarot and some character lore responses can be enriched with live web data.

## 8. Auth and session model
- Auth config is in [`src/auth.ts`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/auth.ts).
- Google OAuth is the only configured provider.
- Session strategy is JWT.
- The app resolves the user ID from Postgres on each JWT callback to keep a stable cross-device identity.

Important local-dev implication:
- Google OAuth callbacks must be valid for `http://localhost:3000` in the Google console, otherwise sign-in can fail even if the app boots.

## 9. Security and runtime notes
### Middleware
[`src/middleware.ts`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/middleware.ts) applies an in-memory per-IP sliding-window rate limiter on several API routes.

### Sensitive config
The app expects many secrets:

- database and redis
- Google OAuth
- multiple AI vendor keys
- Pinecone

Without these, many features degrade or fail. For local boot, the minimum practical set is:
- `DATABASE_URL`
- `REDIS_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- at least one AI provider key

## 10. Mobile / deployment notes
- `capacitor.config.ts` points the mobile shell at a remote URL by default (`https://www.kakoei.com`) unless `CAPACITOR_SERVER_URL` is overridden.
- This is a web-first app packaged into Android, not a separate native backend.
- The repo also contains Vercel-related deployment files and helper scripts.

## 11. Observed strengths
- surprisingly rich full-stack scope in one repo
- clear separation between UI, API routes, infra clients, and AI engine
- self-initializing database schema
- robust provider fallback logic
- good handling for multilingual and Burmese-specific generation concerns
- conversation persistence tries to reconcile local and remote state carefully

## 12. Observed risks / caveats
- repo contains a large number of one-off scripts and historical test files, so maintenance surface is wide
- some scripts appear to contain hardcoded credentials or operational assumptions
- rate limiting is in-memory only, so it does not scale cleanly across multiple instances
- roleplay route is very large and carries many responsibilities, which raises regression risk
- local startup success still depends on remote managed services being reachable
- Google auth can still be a blocker even when everything else is configured correctly

## 13. Local setup summary
### Install
```powershell
npm install
```

### Environment
Create `.env.local` with Postgres, Redis, OAuth, and AI keys.

### Start app
```powershell
npm run dev
```

### Useful verification commands
```powershell
node trigger-init-pg.js
node check-db.js
node production-analysis-test.js
```

## 14. Best mental model
Think of KZodi as:

- a Next.js consumer app
- with an astrology onboarding/reading product on one side
- and an AI roleplay character platform on the other
- both sharing auth, user profile, messaging, memory, and managed cloud infra

The most critical files to understand first are:
- [`src/components/chat-app/ChatApp.tsx`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/components/chat-app/ChatApp.tsx)
- [`src/app/api/roleplay/route.ts`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/app/api/roleplay/route.ts)
- [`src/lib/ai-engine/index.ts`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/lib/ai-engine/index.ts)
- [`src/lib/groq.ts`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/lib/groq.ts)
- [`src/lib/db.ts`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/lib/db.ts)
- [`src/auth.ts`](C:/Users/Administrator/Desktop/kakoei/KZodi/kzodi/src/auth.ts)
