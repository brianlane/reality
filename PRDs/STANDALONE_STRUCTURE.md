# Reality Matchmaking - Standalone Repository Structure

**Single Next.js Application (No Monorepo)**

```
reality-matchmaking/
├── app/                                # Next.js 14 App Router
│   ├── (public)/                       # Public routes (no auth required)
│   │   ├── page.tsx                    # Homepage
│   │   ├── layout.tsx
│   │   ├── how-it-works/
│   │   │   └── page.tsx
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── faq/
│   │   │   └── page.tsx
│   │   ├── apply/                      # Multi-step application
│   │   │   ├── page.tsx                # Step 1: Demographics
│   │   │   ├── questionnaire/
│   │   │   │   └── page.tsx            # Step 2: 80+ questions
│   │   │   ├── photos/
│   │   │   │   └── page.tsx            # Step 3: Upload photos
│   │   │   ├── review/
│   │   │   │   └── page.tsx            # Step 4: Review
│   │   │   └── payment/
│   │   │       └── page.tsx            # Step 5: Pay $199
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/
│   │   │       └── page.tsx            # Clerk sign-in
│   │   └── sign-up/
│   │       └── [[...sign-up]]/
│   │           └── page.tsx            # Clerk sign-up
│   │
│   ├── (applicant)/                    # Applicant dashboard (protected)
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx                # Dashboard home
│   │   ├── application/
│   │   │   └── page.tsx                # Application status
│   │   ├── events/
│   │   │   ├── page.tsx                # Event list
│   │   │   └── [id]/
│   │   │       └── page.tsx            # Event details
│   │   ├── matches/
│   │   │   ├── page.tsx                # Match list
│   │   │   └── [id]/
│   │   │       └── page.tsx            # Match conversation
│   │   └── settings/
│   │       └── page.tsx                # Account settings
│   │
│   ├── (admin)/                        # Admin dashboard (admin only)
│   │   ├── layout.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx                # Admin overview
│   │   │   ├── applications/
│   │   │   │   ├── page.tsx            # Application list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx        # Review application
│   │   │   ├── events/
│   │   │   │   ├── page.tsx            # Event list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx        # Create event
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx        # Event dashboard
│   │   │   │       ├── invite/
│   │   │   │       │   └── page.tsx    # Select participants
│   │   │   │       └── matches/
│   │   │   │           └── page.tsx    # Create matches
│   │   │   ├── matches/
│   │   │   │   └── page.tsx            # Match tracking
│   │   │   └── analytics/
│   │   │       ├── page.tsx            # Analytics overview
│   │   │       ├── events/
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx    # Event analytics
│   │   │       └── matches/
│   │   │           └── page.tsx        # Match analytics
│   │
│   ├── api/                            # API Routes
│   │   ├── applications/
│   │   │   ├── create/
│   │   │   │   └── route.ts
│   │   │   ├── submit/
│   │   │   │   └── route.ts
│   │   │   ├── status/
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   └── upload-photo/
│   │   │       └── route.ts
│   │   ├── applicant/
│   │   │   ├── dashboard/
│   │   │   │   └── route.ts
│   │   │   ├── events/
│   │   │   │   └── route.ts
│   │   │   └── matches/
│   │   │       ├── route.ts
│   │   │       └── [id]/
│   │   │           └── update/
│   │   │               └── route.ts
│   │   ├── admin/
│   │   │   ├── applications/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── approve/
│   │   │   │       │   └── route.ts
│   │   │   │       ├── reject/
│   │   │   │       │   └── route.ts
│   │   │   │       └── waitlist/
│   │   │   │           └── route.ts
│   │   │   ├── events/
│   │   │   │   ├── create/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── invite/
│   │   │   │       │   └── route.ts
│   │   │   │       ├── matches/
│   │   │   │       │   └── route.ts
│   │   │   │       └── complete/
│   │   │   │           └── route.ts
│   │   │   └── analytics/
│   │   │       ├── overview/
│   │   │       │   └── route.ts
│   │   │       ├── events/
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts
│   │   │       └── matches/
│   │   │           └── route.ts
│   │   ├── payments/
│   │   │   └── create-checkout/
│   │   │       └── route.ts
│   │   └── webhooks/
│   │       ├── stripe/
│   │       │   └── route.ts
│   │       ├── idenfy/
│   │       │   └── route.ts
│   │       └── checkr/
│   │           └── route.ts
│   │
│   ├── layout.tsx                      # Root layout
│   └── globals.css
│
├── components/
│   ├── ui/                             # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── textarea.tsx
│   │   └── ...
│   ├── forms/                          # Form components
│   │   ├── ApplicationForm.tsx
│   │   ├── DemographicsStep.tsx
│   │   ├── QuestionnaireStep.tsx
│   │   ├── PhotoUploadStep.tsx
│   │   ├── ReviewStep.tsx
│   │   ├── EventForm.tsx
│   │   └── MatchForm.tsx
│   ├── dashboard/                      # Dashboard components
│   │   ├── StatsCard.tsx
│   │   ├── ApplicationStatusCard.tsx
│   │   ├── UpcomingEventsList.tsx
│   │   ├── MatchList.tsx
│   │   └── RecentActivity.tsx
│   ├── admin/                          # Admin components
│   │   ├── ApplicationTable.tsx
│   │   ├── ApplicationDetailView.tsx
│   │   ├── EventCalendar.tsx
│   │   ├── InviteeSelector.tsx
│   │   ├── MatchBuilder.tsx
│   │   ├── AnalyticsChart.tsx
│   │   └── AdminSidebar.tsx
│   ├── layout/                         # Layout components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── Sidebar.tsx
│   └── marketing/                      # Marketing page components
│       ├── Hero.tsx
│       ├── Features.tsx
│       ├── HowItWorks.tsx
│       ├── Testimonials.tsx
│       ├── Pricing.tsx
│       └── FAQ.tsx
│
├── lib/                                # Business logic & utilities
│   ├── db.ts                           # Prisma client singleton
│   ├── auth.ts                         # Clerk auth helpers
│   ├── utils.ts                        # General utilities
│   ├── validations.ts                  # Zod schemas for validation
│   │
│   ├── stripe.ts                       # Stripe integration (NEW)
│   │   # Port logic from BizBlasts Ruby Stripe code
│   │
│   ├── email/                          # Email service (NEW)
│   │   ├── client.ts                   # Resend client
│   │   ├── queue.ts                    # Email queue (optional)
│   │   ├── send.ts                     # Send helpers
│   │   └── templates/                  # React Email templates
│   │       ├── ApplicationReceived.tsx
│   │       ├── ApplicationApproved.tsx
│   │       ├── ApplicationRejected.tsx
│   │       ├── EventInvitation.tsx
│   │       ├── EventReminder.tsx
│   │       ├── PaymentConfirmation.tsx
│   │       ├── MatchReveal.tsx
│   │       └── FollowUpSurvey.tsx
│   │
│   ├── sms/                            # SMS service (Twilio)
│   │   └── client.ts
│   │
│   ├── background-checks/              # Background check integrations
│   │   ├── idenfy.ts                   # iDenfy API client
│   │   └── checkr.ts                   # Checkr API client
│   │
│   ├── storage/                        # File storage (Supabase)
│   │   └── client.ts
│   │
│   ├── analytics/                      # Analytics (NEW)
│   │   ├── client.ts                   # PostHog/Mixpanel client
│   │   ├── events.ts                   # Event tracking
│   │   ├── metrics.ts                  # Custom metrics
│   │   └── aggregations.ts             # Data aggregations
│   │
│   └── matching/                       # Matching algorithm
│       ├── compatibility.ts            # Compatibility scoring
│       ├── scoring.ts                  # Score calculation
│       └── recommendations.ts          # Match recommendations
│
├── prisma/
│   ├── schema.prisma                   # Database schema (PROVIDED)
│   ├── migrations/                     # Prisma migrations
│   └── seed.ts                         # Database seeding script
│
├── public/
│   ├── images/
│   ├── fonts/
│   └── favicon.ico
│
├── scripts/                            # Utility scripts
│   ├── create-admin.ts                 # Create admin user
│   └── backfill-scores.ts              # Recalculate compatibility scores
│
├── .env.local                          # Local environment variables
├── .env.example                        # Example env file
├── .gitignore
├── middleware.ts                       # Clerk middleware
├── next.config.js                      # Next.js config
├── package.json                        # Dependencies
├── tailwind.config.ts                  # Tailwind config
├── tsconfig.json                       # TypeScript config
├── postcss.config.js                   # PostCSS config
└── README.md
```

---

## Key Files Explained

### `lib/stripe.ts` (NEW - Port from BizBlasts)

```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Port your BizBlasts checkout logic here
export async function createCheckoutSession(params: CheckoutParams) {
  // Same logic as your Ruby Stripe code
}

// Port your webhook verification
export function verifyWebhook(payload: string, signature: string) {
  // Same logic as your Ruby webhook handler
}
```

### `lib/email/client.ts` (NEW - Port from BizBlasts)

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Port your BizBlasts email sending logic
export async function sendEmail(params: EmailParams) {
  // Same triggers and flow as your Ruby email service
}
```

### `lib/analytics/client.ts` (NEW - Port from BizBlasts)

```typescript
import { PostHog } from "posthog-node";

const posthog = new PostHog(process.env.POSTHOG_API_KEY!);

// Track same events you track in BizBlasts
export function trackEvent(userId: string, event: string, properties?: any) {
  // Same analytics events as your Ruby app
}
```

---

## Package.json

```json
{
  "name": "reality-matchmaking",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "prisma generate && next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "stripe:listen": "stripe listen --forward-to localhost:3001/api/webhooks/stripe"
  },
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@prisma/client": "^5.10.0",
    "@clerk/nextjs": "^4.29.0",
    "stripe": "^14.0.0",
    "zod": "^3.22.0",

    "@supabase/supabase-js": "^2.39.0",
    "resend": "^3.0.0",
    "react-email": "^2.0.0",
    "twilio": "^4.20.0",

    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-tabs": "^1.0.4",

    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "date-fns": "^3.0.0",
    "recharts": "^2.10.0",
    "posthog-node": "^3.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "prisma": "^5.10.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.1.0",
    "tsx": "^4.7.0"
  }
}
```

---

## Environment Variables (.env.example)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/reality_matchmaking"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/apply"

# Payments (Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_APPLICATION_FEE_PRICE_ID="price_..."
STRIPE_EVENT_FEE_PRICE_ID="price_..."

# Background Checks
IDENFY_API_KEY="..."
IDENFY_API_SECRET="..."
IDENFY_WEBHOOK_SECRET="..."
CHECKR_API_KEY="..."
CHECKR_WEBHOOK_SECRET="..."

# Email (Resend)
RESEND_API_KEY="re_..."
FROM_EMAIL="noreply@realitymatchmaking.com"

# SMS (Twilio)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1..."

# Storage (Supabase)
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3001"
NODE_ENV="development"
```

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Set up database
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio

# Start dev server
pnpm dev

# Listen to Stripe webhooks (local testing)
pnpm stripe:listen

# Build for production
pnpm build

# Start production server
pnpm start
```

---

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Add environment variables in Vercel dashboard

# Deploy
vercel --prod
```

---

## Key Differences from Original Monorepo Approach

| Aspect       | Original (Monorepo)               | Revised (Standalone)         |
| ------------ | --------------------------------- | ---------------------------- |
| Structure    | Turborepo with shared packages    | Single Next.js app           |
| Code Sharing | Extract modules from BizBlasts    | Port patterns from BizBlasts |
| Complexity   | Higher (multiple packages)        | Lower (one codebase)         |
| Setup Time   | Longer                            | Faster                       |
| Maintenance  | More moving parts                 | Simpler                      |
| Best For     | When BizBlasts is also TypeScript | When BizBlasts is Ruby       |

**Standalone is better for your Ruby + JS setup.**

---

## Files You Already Have

✅ **schema.prisma** - Complete database schema
✅ **API_ENDPOINTS.md** - All API endpoints documented
✅ **IMPLEMENTATION_GUIDE.md** - Week-by-week guide

**You're ready to start building!**
