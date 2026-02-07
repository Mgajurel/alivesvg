# AliveSVG — Setup Guide

Step-by-step guide to configure Clerk (auth), Supabase (database), and Stripe (payments) for local development.

---

## Prerequisites

You need these tools installed before starting.

### Node / Bun

```bash
# Check if bun is installed
bun --version

# If not, install it
curl -fsSL https://bun.sh/install | bash
```

### Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Or via npm (any platform)
npm install -g supabase
```

Verify: `supabase --version`

### Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
# Download the latest release from https://github.com/stripe/stripe-cli/releases
# Extract and move to /usr/local/bin

# Windows (scoop)
scoop install stripe
```

Verify: `stripe --version`

### Install project dependencies

```bash
cd alivesvg
bun install
```

---

## Step 1 — Clerk (Authentication)

Clerk handles user sign-in/sign-up. All pages stay public; auth is only required to copy code or export.

### 1.1 Create a Clerk application

1. Go to [clerk.com](https://clerk.com) and create an account
2. Click **Create application**
3. Name it **AliveSVG**
4. Enable sign-in methods:
   - **Email address** (required)
   - **Google** (recommended)
   - **GitHub** (optional)
5. Click **Create application**

### 1.2 Copy your API keys

1. In the Clerk dashboard sidebar, click **API Keys**
2. You'll see two keys:

| Key | Starts with | Where it goes |
|-----|-------------|---------------|
| Publishable key | `pk_test_` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| Secret key | `sk_test_` | `CLERK_SECRET_KEY` |

Keep these handy — you'll add them to `.env.local` in Step 4.

---

## Step 2 — Supabase (Database)

Supabase provides the Postgres database that stores users, purchases, and export usage.

### 2.1 Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click **New project**
3. Fill in:
   - **Name:** `alivesvg`
   - **Database password:** choose something strong and **save it** — you'll need it to link the CLI
   - **Region:** pick one close to your users
4. Click **Create new project**
5. Wait ~2 minutes for provisioning to finish

### 2.2 Copy your API keys

1. Go to **Settings → API** in the left sidebar
2. You'll need three values:

| Value | Where to find it | Where it goes |
|-------|-------------------|---------------|
| Project URL | Under "Project URL" — looks like `https://abcdefgh.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
| Anon key | Under "Project API keys" → **anon public** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Service role key | Under "Project API keys" → **service_role** (click eye to reveal) | `SUPABASE_SERVICE_ROLE_KEY` |

> **Warning:** The service role key bypasses row-level security. Never expose it on the client side.

### 2.3 Get your project Reference ID

1. Go to **Project Settings → General**
2. Copy the **Reference ID** — the short alphanumeric string (e.g. `abcdefgh`)

### 2.4 Link the CLI and run migrations

```bash
# Link your local project to the remote Supabase project
supabase link --project-ref YOUR_REFERENCE_ID
# Enter your database password when prompted

# Push the migration to create all tables
supabase db push
```

This runs `supabase/migrations/20260207184734_init_schema.sql` which creates:

| Table | Purpose |
|-------|---------|
| `users` | Clerk user ID → plan tier mapping |
| `purchases` | Stripe payment records |
| `studio_usage` | Export count per user (free tier limit) |
| `processed_events` | Webhook idempotency |

**Verify:** Go to **Table Editor** in the Supabase dashboard — you should see all 4 tables.

> **Future schema changes:** Run `supabase migration new my_change_name`, write SQL in the generated file under `supabase/migrations/`, then `supabase db push`.

---

## Step 3 — Stripe (Payments)

Stripe handles the one-time $149 lifetime payment via hosted Checkout.

### 3.1 Create a Stripe account

1. Go to [stripe.com](https://stripe.com) and create an account
2. You'll land in **test mode** by default — stay in test mode for now

### 3.2 Create the product

1. Go to **Product catalog** in the left sidebar
2. Click **Add product**
3. Fill in:
   - **Name:** `AliveSVG Lifetime Access`
   - **Description:** `One-time payment for lifetime access to all 500+ animated icons, unlimited Studio exports, and all future icon packs.`
4. Under **Pricing:**
   - **Price:** `149.00`
   - **Currency:** USD
   - **Billing:** One time
5. Click **Save product**

### 3.3 Copy the Price ID

1. On the product page, find the price row under the Pricing section
2. Click on it — a detail panel opens
3. Copy the **Price ID** — starts with `price_...`

### 3.4 Copy your API keys

1. Click the gear icon (top right) → **Developers** → **API keys**
2. You'll need two keys:

| Key | Starts with | Where it goes |
|-----|-------------|---------------|
| Publishable key | `pk_test_` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Secret key | `sk_test_` (click to reveal) | `STRIPE_SECRET_KEY` |

### 3.5 Set up local webhook forwarding

Stripe sends a `checkout.session.completed` event after payment. During development, the Stripe CLI forwards these to your local server.

```bash
# Log in (opens browser for auth)
stripe login

# Forward events to your local dev server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI prints a **webhook signing secret** starting with `whsec_...`. Copy it — this goes into `STRIPE_WEBHOOK_SECRET`.

> **Keep this terminal running** while you test payments. Each time you restart `stripe listen`, it generates a new `whsec_` secret — update `.env.local` if it changes.

### 3.6 Production webhook (do this when you deploy)

1. In the Stripe dashboard, go to **Developers → Webhooks**
2. Click **Add endpoint**
3. **URL:** `https://yourdomain.com/api/webhooks/stripe`
4. **Events:** select `checkout.session.completed`
5. Click **Add endpoint**
6. Copy the **Signing secret** from the endpoint page
7. Set it as `STRIPE_WEBHOOK_SECRET` in your production environment

---

## Step 4 — Environment Variables

Create `.env.local` in the project root with all the values you collected:

```bash
# ─── Clerk ───────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_PASTE_HERE
CLERK_SECRET_KEY=sk_test_PASTE_HERE
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# ─── Supabase ────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ_PASTE_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=eyJ_PASTE_SERVICE_ROLE_KEY_HERE

# ─── Stripe ──────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_PASTE_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_PASTE_HERE
STRIPE_WEBHOOK_SECRET=whsec_PASTE_HERE
STRIPE_PRICE_ID_LIFETIME=price_PASTE_HERE
```

A reference template is also available at `.env.local.example`.

---

## Step 5 — Run the App

**Terminal 1** — Dev server:

```bash
bun dev
```

**Terminal 2** — Stripe webhook listener:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Open [http://localhost:3000](http://localhost:3000).

---

## Step 6 — Test the Full Flow

### Stripe test cards

| Scenario | Card number | Expected result |
|----------|-------------|-----------------|
| Successful payment | `4242 4242 4242 4242` | Payment succeeds |
| Card declined | `4000 0000 0000 0002` | Payment fails |
| 3D Secure required | `4000 0025 0000 3155` | Auth challenge then succeeds |

Use any future expiry (e.g. `12/30`), any CVC (e.g. `123`), any ZIP.

### Test walkthrough

**1. Unauthenticated visitor**
- Go to `/library`
- All icons are visible with animations playing
- Click copy on any icon → **sign-in modal** appears
- Try Studio → Copy Code → **sign-in modal** appears

**2. Sign in**
- Sign in through the modal or go to `/sign-in`
- Create an account with email or Google

**3. Free user — Library**
- Copy a **free** icon (Arrow Right, Spinner, Heart, Check) → code copies to clipboard
- Copy a **premium** icon (Settings, Home, Bell, etc.) → **upgrade modal** appears
- Premium icons show a lock badge in the top-right corner

**4. Free user — Studio**
- Upload any SVG, pick an animation, click Copy Code
- First 3 exports succeed — counter shows remaining exports
- 4th export attempt → **upgrade modal** appears

**5. Purchase Lifetime Access**
- Click **Get Lifetime Access** from the upgrade modal or the pricing section on the home page
- You're redirected to Stripe Checkout
- Enter test card `4242 4242 4242 4242`
- After payment → redirected to `/checkout/success`
- Check the `stripe listen` terminal — you should see `checkout.session.completed`

**6. Verify post-purchase**
- Go to `/library` — all lock badges are gone, all icons are copyable
- Go to Studio — shows "Unlimited exports", no limits on Copy Code
- Pricing section shows "Purchased" badge on the Lifetime tier

**7. Verify in Supabase**

| Table | What to check |
|-------|---------------|
| `users` | Your row has `plan: lifetime` |
| `purchases` | One row with `status: completed`, correct `amount_cents: 14900` |
| `processed_events` | One row with the Stripe event ID |

---

## Troubleshooting

### Build fails with "Missing publishableKey"

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` must be set at build time. Make sure `.env.local` exists before running `bun build`.

### `supabase link` asks for password and fails

Enter the **database password** you set when creating the Supabase project (Step 2.1). If you forgot it, reset it in **Supabase Dashboard → Settings → Database → Database Password**.

### `supabase db push` fails

- Make sure you've run `supabase link` first
- If tables already exist from a manual run, you can reset with `supabase db reset --linked` (this drops all data)

### Webhook events not arriving

- Is `stripe listen --forward-to localhost:3000/api/webhooks/stripe` running in a separate terminal?
- Does the `STRIPE_WEBHOOK_SECRET` in `.env.local` match the `whsec_...` printed by `stripe listen`?
- Did you restart the dev server after changing `.env.local`? (`bun dev` needs a restart to pick up env changes)

### "Unauthorized" when clicking checkout

- You must be signed in. Check the top-right of the page for the user avatar
- Open browser console (F12) and look for network errors on `/api/checkout`

### Supabase "relation does not exist"

Tables haven't been created. Run:

```bash
supabase link --project-ref YOUR_REFERENCE_ID
supabase db push
```

### User plan not updating after payment

1. Check the `stripe listen` terminal — did `checkout.session.completed` fire?
2. Check `processed_events` table — is the event ID there?
3. Check `users` table — is the `plan` column still `free`?
4. If the event was processed but plan didn't change, check the Stripe dashboard → Payments → click the payment → look at Checkout Session metadata. It should have `clerk_id` and `plan: lifetime`.

### Icons don't show lock badges

- Make sure the `useUserPlan` hook is returning `plan: "free"`
- Check browser console for fetch errors on `/api/user/plan`
- If you just signed in, try a hard refresh (Cmd+Shift+R)
