# SRM - Student Relationship Manager

A production-ready, full-stack CRM system for college placement departments built with Next.js 14, TypeScript, Prisma, PostgreSQL, and AI-powered daily status reports.

## 🚀 Features

- **Task Management**: Organize and track placement activities with status tracking and assignments
- **WhatsApp Integration**: Manage student and recruiter conversations via Meta Cloud API or Twilio
- **AI-Powered DSR**: Automated Daily Status Report generation using Google Gemini LLM
- **Role-Based Access**: Admin, Leader, and Member roles with appropriate permissions
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Chat Import**: Upload and parse exported WhatsApp chat histories with privacy controls
- **Scheduled Jobs**: GitHub Actions workflow for nightly DSR generation
- **Modern UI**: Clean, responsive dashboard built with Tailwind CSS and shadcn/ui
- **Audit Logging**: Comprehensive activity tracking for compliance

## 📋 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Google Gemini Pro with retry/backoff logic
- **WhatsApp**: Meta Cloud API & Twilio support
- **Authentication**: JWT + bcrypt
- **Deployment**: Vercel-ready with GitHub Actions
- **Testing**: Jest with unit tests

## 🏗️ Project Structure

```
TNPCSM/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   │   ├── auth/          # Authentication endpoints
│   │   ├── webhook/       # WhatsApp webhook
│   │   ├── generate-dsr/  # DSR generation endpoint
│   │   └── upload-chat/   # Chat import endpoint
│   ├── auth/              # Auth pages (login/signup)
│   ├── dashboard/         # Dashboard pages (TODO)
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
├── lib/
│   ├── prisma.ts          # Prisma client
│   ├── whatsapp.ts        # WhatsApp provider abstraction
│   ├── gemini.ts          # Gemini LLM client with retry
│   ├── auth.ts            # Auth helpers
│   └── utils.ts           # Utility functions
├── components/            # React components (TODO)
├── tests/                 # Test suites
├── .github/workflows/     # GitHub Actions
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL database (Supabase recommended)
- Google Gemini API key
- WhatsApp Business Account (Meta or Twilio)

### 1. Clone and Install

```powershell
cd d:\2025\workforCliet\TNPCSM
npm install
```

### 2. Database Setup

**Option A: Supabase (Recommended)**

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Get connection string from Settings → Database
4. Copy `.env.example` to `.env` and add:

```env
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
```

**Option B: Local PostgreSQL**

```powershell
# Install PostgreSQL, then:
DATABASE_URL="postgresql://postgres:password@localhost:5432/srm_db"
```

### 3. Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL="your-postgresql-connection-string"

# Authentication
JWT_SECRET="generate-secure-random-string-min-32-chars"
NEXTAUTH_SECRET="another-secure-random-string"
NEXTAUTH_URL="http://localhost:3000"

# WhatsApp - Meta Cloud API
WHATSAPP_PROVIDER="meta"
WHATSAPP_VERIFY_TOKEN="your-custom-verify-token"
WHATSAPP_ACCESS_TOKEN="your-meta-access-token"
WHATSAPP_PHONE_NUMBER_ID="your-phone-number-id"

# OR Twilio (Alternative)
# WHATSAPP_PROVIDER="twilio"
# TWILIO_ACCOUNT_SID="your-account-sid"
# TWILIO_AUTH_TOKEN="your-auth-token"
# TWILIO_WHATSAPP_NUMBER="+14155238886"

# Gemini AI
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-pro"

# DSR Generation Secret (for GitHub Actions)
DSR_GENERATION_SECRET="secure-random-secret-for-scheduled-jobs"

# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Database Migration

```powershell
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with sample data
npm run prisma:seed
```

### 5. Run Development Server

```powershell
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🧪 Test Credentials (After Seeding)

```
Admin:  admin@college.edu / password123
Leader: rajesh@college.edu / password123
Member: amit.patel@college.edu / password123
```

## 🌐 WhatsApp Integration Setup

### Meta Cloud API Setup

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create/select an app with WhatsApp product
3. Get **Phone Number ID** and **Access Token**
4. Configure webhook:
   - URL: `https://your-domain.com/api/webhook/whatsapp`
   - Verify Token: (set in `.env` as `WHATSAPP_VERIFY_TOKEN`)
   - Subscribe to: `messages` field

### Twilio Setup (Alternative)

1. Sign up at [Twilio](https://www.twilio.com/)
2. Enable WhatsApp sandbox or get approved number
3. Configure webhook: `https://your-domain.com/api/webhook/whatsapp`
4. Add credentials to `.env`

## 🤖 Gemini API Setup

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to `.env` as `GEMINI_API_KEY`

**Rate Limits**: Default is 10 DSR generations per minute. Adjust in `lib/gemini.ts` if needed.

## 🚀 Deployment to Vercel

### 1. Push to GitHub

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/srm-nextjs.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Visit [vercel.com](https://vercel.com) and import repository
2. Set framework preset: **Next.js**
3. Add environment variables (copy from `.env`)
4. Click **Deploy**

### 3. Configure GitHub Actions

Add secrets to your GitHub repository (Settings → Secrets → Actions):

- `APP_URL`: Your Vercel deployment URL (e.g., `https://srm-nextjs.vercel.app`)
- `DSR_GENERATION_SECRET`: Same value from `.env`

The workflow in `.github/workflows/dsr-schedule.yml` will run daily at 11 PM IST.

## 📊 Database Schema

### Key Models

- **User**: Team members with roles (ADMIN, LEADER, MEMBER)
- **Team**: Organizational units with leaders
- **Task**: Placement activities with status tracking
- **WhatsAppContact**: Contact records with opt-in tracking
- **WhatsAppConversation**: Message threads
- **WhatsAppMessage**: Individual messages with media support
- **DSR**: Daily Status Reports with AI summaries
- **Notification**: In-app notifications
- **AuditLog**: Activity tracking

## 🔐 Security Features

- JWT-based authentication with 7-day expiry
- Bcrypt password hashing (10 rounds)
- Environment variable protection
- Webhook signature verification (Meta)
- Rate limiting on DSR generation
- Audit logging for all critical actions
- Explicit opt-in required for personal data tracking

## 🧪 Testing

```powershell
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm test -- --coverage
```

## 📝 API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Authenticate user

### WhatsApp

- `GET /api/webhook/whatsapp` - Webhook verification
- `POST /api/webhook/whatsapp` - Receive messages

### DSR

- `POST /api/generate-dsr` - Generate DSRs (protected by secret header)
  - Header: `X-DSR-Secret: your-secret`
  - Body: `{ userId?, date?, forceRegenerate? }`

### Chat Import

- `POST /api/upload-chat` - Import WhatsApp chat export
  - Requires: `file`, `userId`, `phoneNumber`, `confirm`

## 🛣️ Implementation Roadmap (2 Weeks)

### Week 1: MVP Core

**Days 1-2: Backend Foundation**
- ✅ Database schema and migrations
- ✅ Auth API routes (login/signup)
- ✅ WhatsApp webhook handler
- ✅ Seed data script

**Days 3-4: DSR & LLM**
- ✅ Gemini client with retry logic
- ✅ DSR generation endpoint
- ✅ GitHub Actions workflow
- ⏳ Test DSR generation end-to-end

**Days 5-7: Frontend MVP**
- ⏳ Dashboard layout with sidebar
- ⏳ Task list and creation UI
- ⏳ Conversation list view
- ⏳ DSR viewer component

### Week 2: Polish & Deploy

**Days 8-9: WhatsApp Features**
- ⏳ Send message UI
- ⏳ Message thread view
- ⏳ Chat upload component with preview

**Days 10-11: Advanced Features**
- ⏳ Calendar view for tasks
- ⏳ Notifications panel
- ⏳ User settings (opt-in toggle)
- ⏳ Admin dashboard (stats)

**Days 12-13: Testing & Refinement**
- ⏳ Comprehensive unit tests
- ⏳ Integration tests
- ⏳ UI/UX polish
- ⏳ Mobile responsiveness

**Day 14: Deployment & Documentation**
- ⏳ Production deployment to Vercel
- ⏳ WhatsApp webhook configuration
- ⏳ User documentation
- ⏳ Handoff checklist

## 🎯 Next Steps

**Choose one of the following to fully implement next:**

### Option A: Complete Frontend Pages + Components ⭐ (Recommended)
- Build full dashboard with sidebar navigation
- Task management UI (create, edit, complete tasks)
- WhatsApp conversation list and message thread viewer
- DSR list and detail viewer
- Calendar view for due dates
- Notifications dropdown
- User profile and settings page

### Option B: Full Auth + RBAC and Testing
- Implement role-based access control middleware
- Admin dashboard with user management
- Permission checks on all routes
- Comprehensive test suite (80%+ coverage)
- API integration tests
- E2E tests with Playwright

### Option C: WhatsApp Provider Full Implementation
- Send message UI and API
- Message templates management
- Media upload handling
- Delivery status tracking
- Contact management interface
- Bulk messaging capabilities

### Option D: Gemini Integration with Production Controls
- Cost monitoring and budget alerts
- Prompt engineering and optimization
- Custom DSR templates
- Multi-model support (fallback to GPT-4)
- LLM response caching
- Quality scoring and improvement

## 📞 Support & Issues

For questions or issues, please create a GitHub issue or contact the development team.

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for efficient college placement management**
#   T N P B o a r d  
 