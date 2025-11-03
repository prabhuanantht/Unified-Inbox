# Unified Inbox - Multi-Channel Communication Platform

A full-stack Next.js application for managing customer communications across SMS, WhatsApp, Email, and social media channels in a unified inbox.

## 🎯 Features

- **Multi-Channel Messaging**: Support for SMS, WhatsApp, Email, Twitter DMs, Facebook Messenger, Slack
- **Unified Inbox**: Feed + contact threads grouped by contact
- **Contact Management**: Centralized contact profiles with complete message history
- **Message Scheduling**: Schedule messages and automate follow-ups
- **Team Notes**: Notes with @mentions
- **Analytics Dashboard**: Engagement metrics and response times
- **Role-Based Access**: Admin, Editor, Viewer

## 🛠️ Tech Stack

- **App**: Next.js 14+ (App Router, TypeScript)
- **DB**: PostgreSQL with Prisma ORM
- **Auth**: Better Auth (credentials + Google OAuth)
- **Integrations**:
  - Twilio (SMS/WhatsApp)
  - Resend (Email)
  - Slack Web API (DMs/channels)
  - Facebook/Instagram (Graph API)
  - Cloudinary (media hosting)
- **Styling**: Tailwind CSS
- **Data**: React Query, Zod

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL instance
- Twilio account (for SMS/WhatsApp)
- Optional: Google OAuth, Resend API key, Slack/Facebook/Twitter keys, Cloudinary account

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/prabhuanantht/Unified-Inbox.git
cd unified-inbox
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Environment Variables

Copy example and fill values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database (choose ONE of the options below)
# Direct Postgres URL (works everywhere)
# DATABASE_URL="postgresql://user:password@localhost:5432/unified_inbox?schema=public"

# OR Prisma Accelerate URL (faster reads/writes)
# DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-min-32-characters"
BETTER_AUTH_URL="http://localhost:3000"

# If using Accelerate for app but NOT for Better Auth, set a direct URL here
# AUTH_DATABASE_URL="postgresql://user:password@localhost:5432/unified_inbox?schema=public"

# Optional dev bypass (no login needed)
# DEV_DISABLE_AUTH=true

# Twilio (Required for SMS/WhatsApp)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# Email (Resend)
RESEND_API_KEY="your-resend-api-key"
# RESEND_FROM_EMAIL="noreply@yourdomain.com" # use verified domain in production

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Google Gemini AI (Optional - for contact summaries & suggestions)
GEMINI_API_KEY="your-gemini-api-key"
# GEMINI_MODEL="gemini-2.5-flash"  # Optional, defaults to gemini-1.5-flash

# Slack / Meta / Twitter (optional)
SLACK_BOT_TOKEN="xoxb-..."
FACEBOOK_APP_ID="..."
FACEBOOK_APP_SECRET="..."
TWITTER_API_KEY="..."
TWITTER_API_SECRET="..."

# Cloudinary (media hosting)
CLOUDINARY_URL="cloudinary://<key>:<secret>@<cloud_name>"
```

### 4. Set Up Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Optional: open Prisma Studio
npm run prisma:studio
```

### 5. Run the Development Server

```bash
npm run dev
```

Open `http://localhost:3000`.

## 🔌 Integration Setup (Essentials)

### Twilio (SMS/WhatsApp)
1. Create an account and get Account SID + Auth Token.
2. Buy a phone number (SMS/MMS). For WhatsApp, join Sandbox.
3. Set webhook URL to: `/api/webhooks/twilio` (use your deployed URL in production).

### Google OAuth
1. Create OAuth credentials in Google Cloud Console.
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`.

### Cloudinary (Media Uploads)
1. Add `CLOUDINARY_URL` in `.env`.
2. The app uploads attachments to `/api/uploads/cloudinary` and uses the returned `secure_url` for Twilio media.

## 📁 Project Structure (high-level)

```text
unified-inbox/
├── app/
│   ├── api/
│   │   ├── auth/[...auth]/
│   │   ├── contacts/
│   │   ├── messages/
│   │   ├── uploads/cloudinary/
│   │   └── webhooks/
│   ├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── components/
│   └── inbox/
├── lib/
│   ├── integrations/
│   ├── auth.ts
│   ├── auth-prisma.ts
│   ├── prisma.ts
│   ├── cloudinary.ts
│   └── validations.ts
└── prisma/schema.prisma
```

## ⚙️ Notes on Auth & Accelerate

- If `DATABASE_URL` uses Accelerate (`prisma+postgres://`), Better Auth must use a direct Postgres URL. Set `AUTH_DATABASE_URL`.
- To work without login locally, set `DEV_DISABLE_AUTH=true` (middleware will skip auth).

## 🧪 Testing

```bash
npm run lint
npx tsc --noEmit
```

## 🚢 Deployment

- Vercel recommended. Add the same `.env` variables in the dashboard.
- For media uploads, ensure `CLOUDINARY_URL` is set in production.

---

Built with ❤️ for Attack Capital Assignment

## 📚 Assignment Mapping (per “Assignment#2 - Associate Position”)

This section maps the repository to the assignment’s requested structure and deliverables. It is intended to make review fast and objective.

### Key Objectives
- Unify multi-channel communication into a single inbox with per-contact threads
- Provide message composition, scheduling, notes, and analytics
- Support role-based access and basic user management
- Integrate with real-world services (Twilio, Resend, Slack, Meta) with working webhooks

### Quick Setup Steps (Recap)
1) Clone repo and install deps (see Quick Start)
2) Configure `.env` (database, auth, Twilio, Resend, Cloudinary, etc.)
3) Run Prisma migrations and start dev server
4) Optional: run seed script `npm run seed` (if enabled) to create demo data

### Project Overview
- App: Next.js App Router with React Query for data fetching and optimistic updates
- Backend: API routes under `app/api/*` with Prisma-backed Postgres
- Integrations: Twilio, Resend, Slack, Meta webhooks and send flows
- UI: Tailwind + shadcn-like primitives, focused on speed and clarity

### 1. Authentication and User Management
- Auth Provider: Better Auth (credentials + Google OAuth)
- Files: `app/api/auth/[...auth]/route.ts`, `lib/auth.ts`, `lib/auth-prisma.ts`, `middleware.ts`
- Sessions: Prisma models under `prisma/schema.prisma` with session update handling
- RBAC: Lightweight roles in `lib/rbac.ts`; guarded server routes and UI affordances

### 2. Database (Postgres via Prisma)
- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/*` (includes contacts, messages, channels, sessions)
- Scripts: `scripts/check-db.ts`, `scripts/seed.ts`
- Commands: `npm run prisma:generate`, `npm run prisma:migrate`, `npm run prisma:studio`

### 3. Core UI / Frontend (Next.js)
- Inbox Views: `components/inbox/*` (`InboxView`, `ThreadList`, `MessageThread`, `Composer`)
- Analytics: `components/analytics/AnalyticsDashboard.tsx`
- Layout: `components/layout/*`, `app/layout.tsx`, `app/providers.tsx`
- Pages: `app/page.tsx`, `app/dashboard/page.tsx`, `app/login/page.tsx`, `app/register/page.tsx`

### 4. Backend Integrations and Features
- Messaging API: `app/api/messages/route.ts`
- Contacts API: `app/api/contacts/*`
- Notes API: `app/api/notes/route.ts`
- Uploads: `app/api/uploads/cloudinary/route.ts`
- Webhooks: `app/api/webhooks/*` (Twilio, Resend, Slack, Facebook)
- AI: `app/api/ai/*` (contact summary and suggestions via Gemini)
- Scheduling: `lib/scheduler.ts` (+ Twilio call endpoints)

### 5. Code Quality and Documentation
- Type Safety: TypeScript across app and API routes
- Validation: `lib/validations.ts` (Zod)
- Linting/Checks: `npm run lint`, `npx tsc --noEmit`
- Docs: `README.md`, `ENV_VARIABLES.md`, `EMAIL_SETUP.md`, `WEBHOOK_SETUP.md`, `IMPLEMENTATION_SUMMARY.md`

### Detailed Requirements Coverage
- Multi-channel messaging (SMS/WhatsApp/Email/Slack/Meta) with unified threads
- Compose with media uploads, emoji, AI suggestions, scheduling, and voice-call actions
- Contact profiles with merged identities and analytics dashboard
- Webhooks for inbound events (Twilio, Resend, Slack, Facebook)
- RBAC with protected routes, session persistence, and minimal audit via timestamps

### Deliverables Checklist
- [x] Running Next.js app with unified inbox UI
- [x] Postgres schema + Prisma migrations committed
- [x] Working integrations stubs with real send/webhook flows
- [x] Auth (credentials + Google) with roles
- [x] Documentation for setup and environment variables
- [x] Seed/check scripts (optional) and instructions

### Timeline and Submission
- Local run: `npm run dev` then open `http://localhost:3000`
- Deployment: Vercel recommended; replicate `.env` in project settings
- Reviewer notes: See `IMPLEMENTATION_SUMMARY.md` for a concise walkthrough

### Notes for Reviewers
- If you do not intend to configure Twilio/Resend/Slack/Meta, you can:
  - Use `DEV_DISABLE_AUTH=true` to skip login for quick UI review
  - Interact with inbox UI, compose, and AI suggestions without sending
  - Use Prisma Studio to inspect contacts/messages

## ⚖️ Latency, Cost, Reliability by Channel

| Channel | Typical latency | Cost model (high level) | Reliability / limits | Notes & fallbacks |
| --- | --- | --- | --- | --- |
| SMS (Twilio) | ~200ms–2s send; delivery varies by carrier | Per-segment outbound; inbound may be billed by region | Carrier filtering, throughput per-number; 1 TPS baseline without upgrades | Use short codes/verified toll-free for higher throughput; fall back to email if SMS fails |
| WhatsApp (Twilio) | ~300ms–2s | Per message/session pricing | Template approval; session window (24h) | Use pre-approved templates for outbound; fall back to SMS/email when template not allowed |
| Email (Resend) | ~500ms–3s to accepted; inbox delivery varies | Per send; free tier limits | Spam/DMARC/DKIM affect inboxing | Use verified domain and proper headers; show delivery status updates in thread |
| Slack | ~150ms–1s | API usage free within workspace limits | Rate limits (chat.postMessage 1 msg/sec per channel typical) | Backoff on 429 with retry-after; queue bursts |
| Facebook/Instagram | ~300ms–2s | API usage free; business policy limits | 24h customer support window; rate limits | Respect session rules; prompt user to re-initiate outside window |
| Twitter/X | ~300ms–2s (varies with API tier) | Tiered API pricing | Strict rate limits, enterprise access often required | Gate features behind config; degrade gracefully if unavailable |

Service SLAs and costs vary by account/region. The app surfaces message `status` and timestamps per message and avoids blocking UI on third-party confirmation.

## 🧭 Key Architectural Decisions

- Data fetching: React Query with short polling for live feel; webhooks used for inbound events (Twilio/Resend/Slack/Meta). Server invalidates caches on writes for fast UI updates.
- Message delivery: Send endpoints return immediately after provider ACK; provider-specific IDs stored for status updates.
- Media: Cloudinary for durable, CDN-backed media. Messages store `mediaUrls` only.
- Auth: Better Auth with optional `DEV_DISABLE_AUTH` for local demos; middleware enforces sessions in production.
- DB: Prisma on Postgres; migrations committed. Optional Prisma Accelerate URL supported via `DATABASE_URL`.
- AI: Gemini API optional; prompts constrained to recent context for latency and cost control.
- UX: Sticky thread header; contained scroll to prevent page/footer jumps; AI suggestion chips sized for readability and wrap at container edge.

## 🗺️ System Architecture

```mermaid
graph LR
  subgraph Client
    UI[Next.js App Router UI]
  end

  subgraph Next.js App
    API[API Routes (app/api/*)]
    Auth[Better Auth + Middleware]
    RQ[React Query Cache]
  end

  DB[(PostgreSQL)]
  Prisma[Prisma ORM]

  Cloudinary[(Cloudinary CDN/Storage)]
  Twilio[(Twilio SMS/WhatsApp/Voice)]
  Resend[(Resend Email)]
  Slack[(Slack Web API)]
  Meta[(Facebook/Instagram Graph API)]
  Gemini[(Gemini AI)]

  UI -->|fetch/prefetch| API
  UI --> Auth
  API --> Prisma
  Prisma --> DB

  API -->|media uploads| Cloudinary
  API -->|send| Twilio
  API -->|send| Resend
  API -->|send| Slack
  API -->|send| Meta
  API -->|summaries/suggestions| Gemini

  Twilio -->|webhooks inbound| API
  Resend -->|webhooks inbound| API
  Slack -->|events/webhooks| API
  Meta -->|webhooks inbound| API

  API -->|invalidate| RQ
```

