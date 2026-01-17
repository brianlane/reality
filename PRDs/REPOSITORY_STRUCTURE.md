# Reality Matchmaking Monorepo Structure

```
reality-matchmaking-monorepo/
├── apps/
│   ├── reality-matchmaking/              # Main Next.js Application
│   │   ├── app/
│   │   │   ├── (public)/                 # Public routes (no auth)
│   │   │   │   ├── page.tsx              # Homepage
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── how-it-works/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── pricing/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── faq/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── apply/                # Application flow
│   │   │   │   │   ├── page.tsx          # Step 1: Demographics
│   │   │   │   │   ├── questionnaire/
│   │   │   │   │   │   └── page.tsx      # Step 2: 80+ questions
│   │   │   │   │   ├── photos/
│   │   │   │   │   │   └── page.tsx      # Step 3: Upload photos
│   │   │   │   │   ├── review/
│   │   │   │   │   │   └── page.tsx      # Step 4: Review & submit
│   │   │   │   │   └── payment/
│   │   │   │   │       └── page.tsx      # Step 5: Pay application fee
│   │   │   │   ├── sign-in/
│   │   │   │   │   └── [[...sign-in]]/
│   │   │   │   │       └── page.tsx      # Clerk sign-in
│   │   │   │   └── sign-up/
│   │   │   │       └── [[...sign-up]]/
│   │   │   │           └── page.tsx      # Clerk sign-up
│   │   │   │
│   │   │   ├── (applicant)/              # Applicant dashboard (auth required)
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx          # Overview
│   │   │   │   ├── application/
│   │   │   │   │   └── page.tsx          # Application status
│   │   │   │   ├── events/
│   │   │   │   │   ├── page.tsx          # Event list
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx      # Event details
│   │   │   │   ├── matches/
│   │   │   │   │   ├── page.tsx          # Match list
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx      # Match details
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx          # Profile settings
│   │   │   │
│   │   │   ├── (admin)/                  # Admin dashboard (admin role only)
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── admin/
│   │   │   │   │   ├── page.tsx          # Admin home/overview
│   │   │   │   │   ├── applications/
│   │   │   │   │   │   ├── page.tsx      # Application list
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       └── page.tsx  # Review application
│   │   │   │   │   ├── events/
│   │   │   │   │   │   ├── page.tsx      # Event list
│   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   └── page.tsx  # Create event
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       ├── page.tsx  # Event dashboard
│   │   │   │   │   │       ├── invite/
│   │   │   │   │   │       │   └── page.tsx  # Select invitees
│   │   │   │   │   │       └── matches/
│   │   │   │   │   │           └── page.tsx  # Create matches
│   │   │   │   │   ├── matches/
│   │   │   │   │   │   └── page.tsx      # Match tracking
│   │   │   │   │   └── analytics/
│   │   │   │   │       ├── page.tsx      # Analytics dashboard
│   │   │   │   │       ├── events/
│   │   │   │   │       │   └── [id]/
│   │   │   │   │       │       └── page.tsx
│   │   │   │   │       └── matches/
│   │   │   │   │           └── page.tsx
│   │   │   │
│   │   │   └── api/                      # API Routes
│   │   │       ├── applications/
│   │   │       │   ├── create/
│   │   │       │   │   └── route.ts
│   │   │       │   ├── submit/
│   │   │       │   │   └── route.ts
│   │   │       │   ├── status/
│   │   │       │   │   └── [id]/
│   │   │       │   │       └── route.ts
│   │   │       │   └── upload-photo/
│   │   │       │       └── route.ts
│   │   │       ├── applicant/
│   │   │       │   ├── dashboard/
│   │   │       │   │   └── route.ts
│   │   │       │   ├── events/
│   │   │       │   │   └── route.ts
│   │   │       │   └── matches/
│   │   │       │       ├── route.ts
│   │   │       │       └── [id]/
│   │   │       │           └── update/
│   │   │       │               └── route.ts
│   │   │       ├── admin/
│   │   │       │   ├── applications/
│   │   │       │   │   ├── route.ts
│   │   │       │   │   └── [id]/
│   │   │       │   │       ├── route.ts
│   │   │       │   │       ├── approve/
│   │   │       │   │       │   └── route.ts
│   │   │       │   │       ├── reject/
│   │   │       │   │       │   └── route.ts
│   │   │       │   │       └── waitlist/
│   │   │       │   │           └── route.ts
│   │   │       │   ├── events/
│   │   │       │   │   ├── create/
│   │   │       │   │   │   └── route.ts
│   │   │       │   │   ├── route.ts
│   │   │       │   │   └── [id]/
│   │   │       │   │       ├── route.ts
│   │   │       │   │       ├── invite/
│   │   │       │   │       │   └── route.ts
│   │   │       │   │       ├── matches/
│   │   │       │   │       │   └── route.ts
│   │   │       │   │       └── complete/
│   │   │       │   │           └── route.ts
│   │   │       │   └── analytics/
│   │   │       │       ├── overview/
│   │   │       │       │   └── route.ts
│   │   │       │       ├── events/
│   │   │       │       │   └── [id]/
│   │   │       │       │       └── route.ts
│   │   │       │       └── matches/
│   │   │       │           └── route.ts
│   │   │       ├── payments/
│   │   │       │   └── create-checkout/
│   │   │       │       └── route.ts
│   │   │       └── webhooks/
│   │   │           ├── stripe/
│   │   │           │   └── route.ts
│   │   │           ├── idenfy/
│   │   │           │   └── route.ts
│   │   │           └── checkr/
│   │   │               └── route.ts
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                       # shadcn/ui components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── form.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   └── ...
│   │   │   ├── forms/                    # Form components
│   │   │   │   ├── ApplicationForm.tsx
│   │   │   │   ├── QuestionnaireForm.tsx
│   │   │   │   ├── PhotoUpload.tsx
│   │   │   │   └── EventForm.tsx
│   │   │   ├── dashboard/                # Dashboard components
│   │   │   │   ├── StatsCard.tsx
│   │   │   │   ├── ApplicationStatus.tsx
│   │   │   │   ├── UpcomingEvents.tsx
│   │   │   │   └── MatchList.tsx
│   │   │   ├── admin/                    # Admin components
│   │   │   │   ├── ApplicationTable.tsx
│   │   │   │   ├── ApplicationDetail.tsx
│   │   │   │   ├── EventCalendar.tsx
│   │   │   │   ├── InviteeSelector.tsx
│   │   │   │   ├── MatchBuilder.tsx
│   │   │   │   └── AnalyticsCharts.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   └── marketing/
│   │   │       ├── Hero.tsx
│   │   │       └── Features.tsx
│   │   │
│   │   ├── lib/
│   │   │   ├── db.ts                     # Prisma client
│   │   │   ├── auth.ts                   # Clerk helpers
│   │   │   ├── utils.ts                  # Utility functions
│   │   │   ├── validations.ts            # Zod schemas
│   │   │   ├── matching/                 # Matching algorithm
│   │   │   │   ├── compatibility.ts
│   │   │   │   ├── scoring.ts
│   │   │   │   └── recommendations.ts
│   │   │   └── analytics/
│   │   │       ├── metrics.ts
│   │   │       └── aggregations.ts
│   │   │
│   │   ├── prisma/
│   │   │   ├── schema.prisma             # Database schema
│   │   │   ├── migrations/               # Prisma migrations
│   │   │   └── seed.ts                   # Database seeding
│   │   │
│   │   ├── public/
│   │   │   ├── images/
│   │   │   ├── fonts/
│   │   │   └── favicon.ico
│   │   │
│   │   ├── styles/
│   │   │   └── globals.css
│   │   │
│   │   ├── .env.local                    # Environment variables
│   │   ├── .env.example
│   │   ├── next.config.js
│   │   ├── package.json
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── bizblasts/                        # Existing BizBlasts app
│       └── ...                           # (existing structure)
│
├── packages/
│   ├── shared-payments/                  # Shared Stripe logic
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── stripe.ts                 # Stripe client setup
│   │   │   ├── checkout.ts               # Checkout session creation
│   │   │   ├── webhooks.ts               # Webhook handlers
│   │   │   ├── types.ts                  # Payment types
│   │   │   └── utils.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared-email/                     # Shared email/SMS
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── resend.ts                 # Resend client
│   │   │   ├── twilio.ts                 # Twilio client
│   │   │   ├── templates/                # React Email templates
│   │   │   │   ├── ApplicationReceived.tsx
│   │   │   │   ├── ApplicationApproved.tsx
│   │   │   │   ├── ApplicationRejected.tsx
│   │   │   │   ├── EventInvitation.tsx
│   │   │   │   ├── EventReminder.tsx
│   │   │   │   ├── MatchReveal.tsx
│   │   │   │   └── FollowUpSurvey.tsx
│   │   │   ├── queue.ts                  # Email queue (BullMQ)
│   │   │   └── types.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared-analytics/                 # Shared analytics
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── posthog.ts                # PostHog client
│   │   │   ├── mixpanel.ts               # Mixpanel client
│   │   │   ├── events.ts                 # Event tracking
│   │   │   └── types.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared-ui/                        # Shared UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   └── ...
│   │   │   └── styles/
│   │   │       └── globals.css
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared-config/                    # Shared configs
│   │   ├── eslint-config.js
│   │   ├── tailwind-config.js
│   │   └── typescript-config.json
│   │
│   └── shared-types/                     # Shared TypeScript types
│       ├── src/
│       │   ├── applicant.ts
│       │   ├── event.ts
│       │   ├── match.ts
│       │   ├── payment.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml                        # CI/CD for all apps
│       ├── deploy-reality.yml            # Deploy Reality Matchmaking
│       └── deploy-bizblasts.yml          # Deploy BizBlasts
│
├── .gitignore
├── turbo.json                            # Turborepo config
├── package.json                          # Root package.json
├── pnpm-workspace.yaml                   # pnpm workspace config
└── README.md
```

---

## Key Configuration Files

### Root `package.json`

```json
{
  "name": "reality-matchmaking-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "dev:reality": "turbo run dev --filter=reality-matchmaking",
    "dev:bizblasts": "turbo run dev --filter=bizblasts",
    "build": "turbo run build",
    "build:reality": "turbo run build --filter=reality-matchmaking",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "db:migrate": "turbo run db:migrate",
    "db:push": "turbo run db:push",
    "db:studio": "turbo run db:studio"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  },
  "packageManager": "pnpm@8.0.0"
}
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^test"]
    },
    "db:migrate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    }
  }
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Reality Matchmaking `package.json`

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
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@prisma/client": "^5.10.0",
    "@clerk/nextjs": "^4.29.0",
    "zod": "^3.22.0",
    "stripe": "^14.0.0",
    "@shared/payments": "workspace:*",
    "@shared/email": "workspace:*",
    "@shared/analytics": "workspace:*",
    "@shared/ui": "workspace:*",
    "@shared/types": "workspace:*",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "date-fns": "^3.0.0",
    "recharts": "^2.10.0"
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

## Environment Variables Structure

### `.env.example` for Reality Matchmaking

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

# Email
RESEND_API_KEY="re_..."
FROM_EMAIL="noreply@realitymatchmaking.com"

# SMS
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1..."

# Storage (Supabase)
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Analytics
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# Redis (Upstash)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3001"
NODE_ENV="development"
```

---

## Development Commands

```bash
# Install all dependencies
pnpm install

# Start Reality Matchmaking dev server
pnpm dev:reality

# Start BizBlasts dev server
pnpm dev:bizblasts

# Start both apps
pnpm dev

# Build Reality Matchmaking
pnpm build:reality

# Run database migrations
cd apps/reality-matchmaking && pnpm db:migrate

# Open Prisma Studio
cd apps/reality-matchmaking && pnpm db:studio

# Lint all projects
pnpm lint

# Run tests
pnpm test
```

---

## Deployment Structure

- **Vercel Projects:**
  - `reality-matchmaking` (https://realitymatchmaking.com)
  - `bizblasts` (https://bizblasts.com)

- **Databases:**
  - Supabase: `reality-matchmaking-db`
  - Supabase: `bizblasts-db`

- **Storage:**
  - Supabase Storage: `reality-matchmaking-photos`
  - Upstash Redis: Shared cache

- **CI/CD:**
  - GitHub Actions deploy on push to `main`
  - Separate workflows for each app
  - Automatic Prisma migrations on deploy
