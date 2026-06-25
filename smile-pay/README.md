# Pay, by talking — conversational + face-liveness checkout (TEST MODE)

A working demo of "agentic commerce": you chat with an assistant to build an
order, confirm with a simulated face/liveness check, then pay with a real
Stripe **test-mode** card. No real money ever moves — see "What's real and
what's simulated" below before you show this to anyone.

## What's real and what's simulated

| Piece | Status |
|---|---|
| Chat → cart parsing | **Real.** Rule-based intent parser (`backend/agent.js`), fully inspectable, no hidden LLM call. |
| Multi-currency pricing | **Real math**, demo FX rates (`backend/pricing.js`). Swap in a live FX API for production. |
| Card payment | **Real Stripe API call, test mode.** Uses Stripe's actual PaymentIntents + Elements. Swapping the test keys for live keys is the only change needed to take real payments — but that also means real legal/compliance obligations apply, see below. |
| Face / liveness scan | **Simulated.** `backend/server.js`'s `/api/liveness/verify` always succeeds after a delay. There is no camera access, no face matching, no anti-spoof depth sensing. Real liveness requires a licensed biometric SDK (e.g. FaceTec, AWS Rekognition Liveness, iProov) plus an enrolled face template per user — a serious undertaking with its own biometric-privacy law obligations (BIPA in Illinois, GDPR biometric category in the EU, etc.). |

## Before going live with real payments

Switching from test to live Stripe keys is a config change, but operating a
real payment system is not just a config change. You'd need, at minimum:
a registered business entity, a live Stripe (or equivalent) merchant
account that's passed their underwriting/KYC review, PCI-DSS compliance
(Stripe Elements handles most of this for you by never letting card numbers
touch your server), and — if you add real biometrics — compliance with
biometric privacy law in every region you operate. None of that is
optional, regardless of which company's tools you build on.

## Architecture

```
backend/   Express API — catalog, chat agent, simulated liveness, Stripe PaymentIntents
frontend/  React (Vite) — chat UI, order-card receipts, liveness animation, Stripe Elements
```

The Stripe **secret** key never leaves the backend. The frontend only ever
sees the **publishable** key (`pk_test_...`), which is safe to expose — this
split is why this is two separate apps rather than one static page.

## Setup

### 1. Get free Stripe test keys
Sign up at https://dashboard.stripe.com (free) → Developers → API keys
(make sure you're in **test mode**, toggle top-right). You need:
- Secret key (`sk_test_...`) → backend
- Publishable key (`pk_test_...`) → frontend

### 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env, paste your sk_test_... key
npm install
npm start
```

Runs on http://localhost:4242.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# edit .env, paste your pk_test_... key
npm install
npm run dev
```

Runs on http://localhost:5173, proxies `/api` to the backend.

## Using it

Try typing:
- "show me what you sell"
- "add the blue sneakers"
- "I want headphones and a watch"
- "checkout"

Then run the face-verification step (just a button + animation here) and
pay with Stripe's standard test card: `4242 4242 4242 4242`, any future
expiry, any CVC, any ZIP.

## Extending the agent

`backend/agent.js` is intentionally simple pattern-matching so it's free,
instant, and fully transparent. To make it handle genuinely ambiguous
language, you'd route the message through an LLM (e.g. the Claude API) to
extract structured intent, then keep this file's validation logic — never
let the LLM's output directly trigger a payment without validating product
IDs and quantities server-side first, the same way this code already does.
