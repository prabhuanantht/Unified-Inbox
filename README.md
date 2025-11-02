# Unified Inbox - Multi-Channel Communication Platform

A full-stack Next.js application for managing customer communications across SMS, WhatsApp, Email, and social media channels in a unified inbox.

## 🎯 Features

- **Multi-Channel Messaging**: Support for SMS, WhatsApp, Email, Twitter DMs, and Facebook Messenger
- **Unified Inbox**: Kanban-style view with threads grouped by contact
- **Contact Management**: Centralized contact profiles with complete message history
- **Message Scheduling**: Schedule messages and automate follow-ups
- **Real-Time Collaboration**: Team notes with @mentions and real-time presence
- **Analytics Dashboard**: Track engagement metrics, response times, and channel performance
- **Role-Based Access**: Admin, Editor, and Viewer roles with appropriate permissions

## 🛠️ Tech Stack

- **Frontend/Backend**: Next.js 14+ (App Router, TypeScript)
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: Better Auth (credentials + Google OAuth)
- **Integrations**: 
  - Twilio SDK (SMS/WhatsApp)
  - Resend (Email - optional)
  - Twitter API v2 (optional)
  - Facebook Graph API (optional)
- **Styling**: Tailwind CSS
- **State Management**: React Query
- **Validation**: Zod

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- Twilio account (free trial available)
- Optional: Google OAuth credentials, Resend API key, social media API keys

## 🚀 Quick Start

### 1. Clone the Repository

\`\`\`bash
git clone <your-repo-url>
cd unified-inbox
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
# or
yarn install
\`\`\`

### 3. Set Up Environment Variables

Copy the example environment file:

\`\`\`bash
cp .env.example .env
\`\`\`

Edit \`.env\` and fill in your credentials:

\`\`\`env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/unified_inbox"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-min-32-characters"
BETTER_AUTH_URL="http://localhost:3000"

# Twilio (Required)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# Optional Integrations
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
RESEND_API_KEY="your-resend-api-key"
\`\`\`

### 4. Set Up Database

\`\`\`bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Optional: Open Prisma Studio to view data
npm run prisma:studio
\`\`\`

### 5. Run the Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📊 Database Schema (ERD)

\`\`\`mermaid
erDiagram
    User ||--o{ Contact : creates
    User ||--o{ Message : sends
    User ||--o{ Note : writes
    User ||--o{ Session : has
    Contact ||--o{ Message : receives
    Contact ||--o{ Note : has

    User {
        string id PK
        string email UK
        string name
        string password
        enum role
        datetime createdAt
        datetime updatedAt
    }

    Contact {
        string id PK
        string userId FK
        string name
        string phone
        string email
        json socialHandles
        array tags
        datetime createdAt
        datetime updatedAt
    }

    Message {
        string id PK
        string contactId FK
        string userId FK
        string senderId FK
        enum channel
        enum direction
        string content
        enum status
        json metadata
        array mediaUrls
        datetime scheduledFor
        datetime sentAt
        datetime deliveredAt
        datetime readAt
        datetime createdAt
        datetime updatedAt
    }

    Note {
        string id PK
        string contactId FK
        string userId FK
        string content
        boolean isPrivate
        array mentions
        datetime createdAt
        datetime updatedAt
    }
\`\`\`

## 🔌 Integration Setup

### Twilio (SMS/WhatsApp)

1. Create a free account at [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Get your Account SID and Auth Token from the dashboard
3. Buy a phone number with SMS and MMS capabilities
4. For WhatsApp: Join the Twilio Sandbox by sending "join <sandbox-word>" to +1-415-523-8886
5. Configure webhook URL in Twilio Console:
   - Go to Phone Numbers → Manage → Active numbers
   - Select your number
   - Under "Messaging", set webhook to: \`https://your-domain.com/api/webhooks/twilio\`

### Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: \`http://localhost:3000/api/auth/callback/google\`

### Resend (Email - Optional)

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Verify your domain for production use

## 📁 Project Structure

\`\`\`
unified-inbox/
├── app/
│   ├── api/
│   │   ├── auth/[...auth]/     # Authentication endpoints
│   │   ├── contacts/           # Contact CRUD operations
│   │   ├── messages/           # Message send/receive
│   │   ├── notes/              # Internal notes
│   │   ├── analytics/          # Analytics data
│   │   └── webhooks/           # Webhook handlers
│   ├── dashboard/              # Main dashboard page
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   ├── providers.tsx           # React Query provider
│   └── globals.css             # Global styles
├── components/
│   ├── inbox/                  # Inbox components
│   │   ├── InboxView.tsx
│   │   ├── ThreadList.tsx
│   │   ├── MessageThread.tsx
│   │   └── Composer.tsx
│   └── layout/                 # Layout components
│       ├── Sidebar.tsx
│       └── Header.tsx
├── lib/
│   ├── integrations/           # Channel integrations
│   │   ├── base.ts
│   │   ├── twilio.ts
│   │   └── index.ts
│   ├── auth.ts                 # Auth configuration
│   ├── prisma.ts               # Prisma client
│   ├── scheduler.ts            # Message scheduler
│   ├── utils.ts                # Utility functions
│   └── validations.ts          # Zod schemas
├── prisma/
│   └── schema.prisma           # Database schema
├── .env.example                # Environment variables template
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
\`\`\`

## 🔐 Security Considerations

- All API routes should validate authentication tokens
- Webhook endpoints must verify signatures (Twilio, Facebook, etc.)
- Environment variables are never committed to git
- Passwords are hashed using Better Auth's built-in security
- Private notes use encryption (implement Prisma middleware)
- CORS is configured appropriately for production

## 📊 Integration Comparison

| Channel | Latency | Cost (per msg) | Reliability | Rich Media | Two-Way |
|---------|---------|----------------|-------------|------------|---------|
| SMS | < 1s | $0.0075 | 99.9% | ❌ | ✅ |
| WhatsApp | < 2s | $0.005-0.01 | 99.5% | ✅ | ✅ |
| Email | 1-5s | $0.0001 | 98% | ✅ | ✅ |
| Twitter DM | 2-5s | Free | 95% | ✅ | ✅ |
| Facebook | 2-5s | Free | 95% | ✅ | ✅ |

## 🎨 Key Architectural Decisions

### 1. Channel Integration Pattern
- **Factory Pattern**: \`createSender(channel)\` abstracts channel-specific logic
- **Benefits**: Easy to add new channels, consistent interface, testable
- **Trade-off**: Additional abstraction layer

### 2. Message Scheduling
- **Approach**: Postgres-based with cron job processor
- **Benefits**: Simple, reliable, no external dependencies
- **Trade-off**: Not ideal for high-scale (would need Redis/Bull)

### 3. Real-Time Updates
- **Current**: Polling via React Query
- **Future**: WebSocket for true real-time (Socket.io or Pusher)
- **Benefits**: Simpler initial implementation
- **Trade-off**: Higher bandwidth usage

### 4. Data Normalization
- **Unified Message Table**: All channels share same schema
- **Benefits**: Simpler queries, consistent UX
- **Trade-off**: Channel-specific metadata stored as JSON

### 5. Authentication
- **Better Auth**: Modern alternative to NextAuth
- **Benefits**: TypeScript-first, flexible, good DX
- **Trade-off**: Smaller community than NextAuth

## 🧪 Testing

\`\`\`bash
# Run linter
npm run lint

# Type checking
npx tsc --noEmit
\`\`\`

## 📈 Performance Optimization

- Database indexes on frequently queried fields
- React Query caching for API responses
- Lazy loading of contact list
- Image optimization for media attachments
- Connection pooling for Prisma

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel dashboard
3. Add environment variables
4. Deploy

### Docker

\`\`\`bash
# Build image
docker build -t unified-inbox .

# Run container
docker run -p 3000:3000 --env-file .env unified-inbox
\`\`\`

### Database Hosting

- **Supabase**: Free tier with Postgres
- **Neon**: Serverless Postgres
- **Railway**: Simple deployment

## 📝 API Documentation

### Contacts

- \`GET /api/contacts\` - List all contacts
- \`POST /api/contacts\` - Create contact
- \`GET /api/contacts/[id]\` - Get contact details
- \`PATCH /api/contacts/[id]\` - Update contact
- \`DELETE /api/contacts/[id]\` - Delete contact

### Messages

- \`GET /api/messages?contactId={id}\` - Get messages for contact
- \`POST /api/messages\` - Send a message

### Notes

- \`GET /api/notes?contactId={id}\` - Get notes for contact
- \`POST /api/notes\` - Create a note

### Analytics

- \`GET /api/analytics?days={30}\` - Get analytics data

### Webhooks

- \`POST /api/webhooks/twilio\` - Twilio message webhook

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Open a GitHub issue
- Check existing documentation
- Review Twilio/Better Auth documentation

## 🎯 Roadmap

- [ ] Voice calling integration (Twilio Voice)
- [ ] Advanced analytics (cohort analysis, funnels)
- [ ] Template library for common messages
- [ ] AI-powered message suggestions
- [ ] Mobile app (React Native)
- [ ] Email template builder
- [ ] Zapier integration
- [ ] HubSpot two-way sync
- [ ] Advanced automation rules
- [ ] Team collaboration features

---

Built with ❤️ for Attack Capital Assignment
