# AI Council 🤖

**A production-ready multi-LLM research dashboard** — ask one question and receive parallel, streamed answers from GPT-4, Gemini, Claude, Perplexity, and more.

## Features

- **Parallel streaming** — send the same message to N models simultaneously via SSE
- **Research workflow** — create threads, add follow-up questions, search history
- **Synthesis** — one click to generate an attributed combined answer
- **Export** — download full council view as Markdown or PDF
- **Settings** — per-model temperature/max tokens, concurrency cap, context mode

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in at least one API key to get started:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Auto-set to `file:./dev.db` (SQLite — no setup needed) |
| `NEXTAUTH_SECRET` | Random secret (run: `openssl rand -base64 32`) |
| `OPENAI_API_KEY` | OpenAI API key |
| `GEMINI_API_KEY` | Google AI Studio key |
| `OPENAI_COMPAT_BASE_URL` | Optional: custom OpenAI-compatible base URL |
| `OPENAI_COMPAT_API_KEY` | Optional: custom endpoint API key |

### 3. Set up the database

No PostgreSQL needed — the app uses **SQLite** (a local file). Just run:

```bash
npx prisma db push
npx prisma generate
```

This creates `prisma/dev.db` automatically. Optionally seed demo data:
```bash
npx prisma db seed
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. **Select models** — click ⚙️ Settings → check the models you want
2. **Ask a question** — type in the input bar and press Enter (or Ctrl+K to focus)
3. **Watch responses stream** — cards appear side-by-side with live streaming
4. **Synthesize** — click "Synthesize" for a combined, attributed answer
5. **Export** — click "Export MD" to download a Markdown file

## Architecture

```
lib/
  adapters/
    types.ts          # Adapter interface & model configs
    openai.ts         # OpenAI Chat Completions (GPT-4o, o1, etc.)
    gemini.ts         # Google Generative AI
    anthropic.ts      # Anthropic Messages API
    perplexity.ts     # Perplexity (with citations)
    openai-compat.ts  # Custom OpenAI-compatible endpoint
    index.ts          # Adapter registry
  orchestrator.ts     # Parallel execution with concurrency + retries
  db.ts               # Prisma client singleton
  export.ts           # Markdown/PDF export utilities

app/api/
  threads/            # CRUD for conversation threads
  council/stream/     # SSE streaming endpoint
  synthesize/         # Synthesis generation

components/
  council/
    ModelCard.tsx     # Individual model response card
    CouncilGrid.tsx   # Responsive model grid
    SynthesisCard.tsx # Synthesis display
  layout/
    Sidebar.tsx       # Thread list
    SettingsDrawer.tsx # Model picker & settings

store/councilStore.ts # Zustand state management
hooks/useCouncilStream.ts # SSE client hook
```

## Deployment (Vercel)

1. Push to GitHub and import to [Vercel](https://vercel.com)
2. Add your AI API keys as environment variables in the Vercel dashboard
3. For production, consider switching to [Turso](https://turso.tech) (hosted SQLite/libSQL) or [Neon](https://neon.tech) (PostgreSQL) and updating `prisma.config.ts` accordingly
4. Add to `package.json` so Vercel generates the Prisma client on deploy:

```json
"scripts": {
  "postinstall": "prisma generate"
}
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query + Zustand
- **Backend**: Next.js Route Handlers + SSE
- **Database**: SQLite (local, zero-config) + Prisma ORM
- **AI SDKs**: openai, @google/generative-ai
