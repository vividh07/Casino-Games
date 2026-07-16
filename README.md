# LuckPocket

Casual Gen Z mini-games web app with a shared **virtual** in-game economy (Pocket + Bank).  
No real money, payments, or withdrawals — entertainment only.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4 + Framer Motion
- Zustand for session/wallet state
- Supabase (Auth + Postgres RPCs + optional Edge cron)
- Local **demo mode** when Supabase env vars are missing (mirrors server rules in `src/lib/demo/engine.ts`)

## Quick start

```bash
npm install
npm run dev
```

Open the app, create an account (or sign up with any email in demo mode). New players start with **₹1,500 Pocket**.

### Supabase setup

1. Create a Supabase project.
2. Run SQL migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_game_and_wallet_rpcs.sql`
   - `supabase/migrations/003_scheduled_jobs.sql`
3. Copy `.env.example` → `.env` and set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

4. (Optional) Deploy `supabase/functions/scheduled-economy` on a daily cron for loan interest + bank interest.

## Games

Blackjack · Teen Patti · Wheel · Slots · Crash · Plinko · Dragon Tiger

All outcomes and balance updates go through `play_game` (Supabase RPC) or the demo engine — never trusted from the client. Target RTP ≈ 95–97%.

## Deploy

- **Vercel / Netlify**: build `npm run build`, publish `dist` (SPA rewrites included).
- Set the same `VITE_SUPABASE_*` env vars in the host dashboard for production.

## Disclaimer

For entertainment only — no real money involved.
