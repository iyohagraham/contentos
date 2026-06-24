# ContentOS

**An AI Media Operating System** — plan, create, manage, publish, analyze, and continuously improve media production across every content platform. ContentOS is modular, provider-agnostic, and scalable: the platform itself is the orchestration layer.

> Not a video generator. An AI Media OS built from **21 single-responsibility engines** that communicate only through structured JSON **contracts**. Every provider is replaceable; no workflow is hardcoded; every project is resumable.

See **AGENTS.md** for the canonical architecture, engine catalog, contracts, and status (it is the source of truth — read it first).

## The 21 Engines

Knowledge · Creative Director · Strategy · Style · Universe · Character · Brand · Story · Storyboard · Continuity · Scene Planner · Media Router · Asset Manager · Voice · Music · **Composition (HyperFrames)** · **Rendering (FFmpeg)** · Publishing · Analytics · Learning · Franchise

Introspect the live architecture at runtime: `GET /api/engines` (and `?run=<engineId>` to invoke one).

**Production pipeline:**
`Knowledge → Creative Direction → Strategy → Style → Universe → Characters → Story → Storyboard → Continuity → Scene Planning → Media Router → Voice → Music → Composition → Rendering → Publishing → Analytics → Learning`

## Provider policy

- **Runware** — primary media provider (images/video/edit/upscale/bg-removal/inpaint)
- **Qwen-3-TTS + OmniVoice Studio** — primary voice
- **HyperFrames** — composition engine
- **FFmpeg** — rendering engine

Every provider stays replaceable; routers make the selection. (OpenMontage has been removed — the platform owns every layer.)

## Quick Start

```bash
cd ContentOS
npm install
cp .env.example .env.local   # add keys (see AGENTS.md → Environment Variables)
npm run dev                  # Vite (5173) + Express API mirror (3001)
```

Open **http://localhost:5173**. Runs in localStorage mode with no keys; cloud features activate once Supabase is provisioned.

## Technology Stack

- **Frontend**: React 18 + Vite 5 + TailwindCSS (code-split per view), lucide-react, recharts
- **Backend**: Vercel serverless functions — plain JavaScript ESM, Node 24
- **Engines/Contracts**: `api/_engines/` (+ `registry.js`) and `api/_contracts/`
- **DB/Auth**: Supabase (Postgres + pgvector + RLS)
- **Text AI**: Kimi (Moonshot) → OpenAI fallback; embeddings: OpenAI
- **Media**: Runware (primary) → fal.ai fallback; Voice: Qwen-3-TTS / Kokoro
- **Composition**: HyperFrames · **Rendering**: FFmpeg · **Publishing**: Postiz

## License

MIT
