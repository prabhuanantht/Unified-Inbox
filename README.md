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
git clone <your-repo-url>
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
