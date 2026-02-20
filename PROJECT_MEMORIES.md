# KZodi Project Memories & Architecture

## 1. Project Overview
**KZodi** is a Next.js-based web application focused on Astrology, Personality Analysis (MBTI), and AI Roleplay characters. It features:
- **Astrology Readings**: Personalized horoscopes based on Zodiac signs.
- **AI Chat/Oracle**: A "KZodi Oracle" that provides astrological advice using Groq (Llama-3).
- **Character Roleplay**: Chat with fictional characters, with support for specific personalities and "stickers".
- **Sticker Generation**: Generates stickers using Together AI (Google Flash Image model).
- **Memory System (Partial)**: Ingestion pipeline for documents (PDF/EPUB/URL) into Pinecone vector database for character knowledge.

## 2. Technology Stack
- **Framework**: Next.js 15 (App Router), React 19
- **Language**: TypeScript
- **Styling**: TailwindCSS 4, Framer Motion
- **Database**: 
  - **Neon (PostgreSQL)**: Stores user feedback and readings (`src/lib/db.ts`).
  - **Pinecone**: Vector database for semantic search/character memory (`src/lib/ai-setup.ts`, `api/character/setup`).
- **AI/LLM**:
  - **Groq SDK**: Fast inference for Llama-3-70b-versatile (Chat, Roleplay, Analysis).
  - **Xenova/transformers**: Local embeddings (`all-MiniLM-L6-v2`) for vectorization.
  - **Together AI**: Image generation for stickers.
- **Authentication**: NextAuth.js (v5 beta).
- **Utilities**: `cheerio` (scraping), `pdf-parse`/`epub2` (document processing), `zustand` (state).

## 3. Directory Structure
### Root
- `kzodi/`: Main source code.
- `run-kzodi.ps1`: Helper script to run the app.
- `test_*.ps1`: PowerShell scripts for testing various APIs (Gemini, Sticker, XAI).

### Source (`src/`)
- `app/api/`: Backend API routes.
  - `auth/`: NextAuth endpoints.
  - `chat/`: Oracle chat logic (`route.ts`).
  - `roleplay/`: Character roleplay chat (`route.ts`).
  - `character/setup/`: Ingestion endpoint for character documents -> Pinecone.
  - `sticker/`: Sticker generation endpoints.
  - `feedback/`: Storing user feedback in Neon.
- `lib/`: Core logic and configurations.
  - `ai-setup.ts`: Logic for parsing files (PDF/EPUB) and indexing into Pinecone.
  - `groq.ts`: Groq client wrapper.
  - `db.ts`: Neon database connection and schema management.
  - `stickerPacks.ts`: Logic/Restrictions for stickers.
  - `store.ts` & `chatStore.ts`: Zustand stores for client-side state.

## 4. Key Logic Flows

### A. Astrology Oracle Chat (`api/chat`)
1. Receives user message, Zodiac sign, MBTI.
2. Constructs a system prompt for "KZodi Oracle".
3. Calls Groq (Llama-3) for a response.
4. **Note**: No long-term memory or RAG retrieval used here currently.

### B. Character Roleplay (`api/roleplay`)
1. Receives message, character name, personality.
2. Constructs system prompt enforcing personality and sticker usage rules.
3. Sanitizes "stickers" (removes forbidden subjects).
4. Calls Groq.
5. **Observation**: Does not currently retrieve context from Pinecone, despite `ai-setup.ts` existing.

### C. Character Setup (`api/character/setup`)
1. Accepts file upload (PDF/TXT/EPUB) or URL.
2. Extracts text using `ai-setup.ts`.
3. Analyzes text with Groq to generate a JSON Character Profile.
4. **Indexes** the text: Chunks it, generates embeddings (local), and upserts to Pinecone index `kzodi-characters`.

### D. Sticker Generation
1. Uses prompt to generate images via Together AI (`google/flash-image-2.5`).
2. returns base64 or URL.

## 5. Deployment & Environment
- Requires `.env` with keys:
  - `GROQ_API_KEY`
  - `PINECONE_API_KEY`
  - `DATABASE_URL` (Neon)
  - `NEXTAUTH_SECRET`
  - `TOGETHER_API_KEY` (or similar for stickers)

## 6. Recommendations / TODOs
- **Connect RAG**: The `api/roleplay` endpoint should query Pinecone (`kzodi-characters`) for relevant context before calling Groq, enabling "Memory".
- **Error Handling**: Enhance `db.ts` connection resilience.
- **Environment**: Ensure all API keys are set in `.env.local`.

This document serves as the project's memory bank for future development.
