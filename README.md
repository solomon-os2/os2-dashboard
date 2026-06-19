# OS2 Order Tracker

Customer order tracking portal for OS2 Performance Apparel. Orders sync from Trello; customers log in with a portal ID and PIN.

## Stack

- Next.js 15 (App Router)
- Supabase (`customers` table)
- Trello API (read orders, post comments/attachments)
- iron-session (auth cookies)

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Fill in `.env` (never commit this file):

| Variable | Purpose |
|---|---|
| `TRELLO_API_KEY` / `TRELLO_TOKEN` | Trello API access (boards are chosen in `/admin`) |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase project |
| `SUPABASE_ACCESS_TOKEN` | Personal token for `npm run db:setup` only |
| `SESSION_SECRET` | Cookie encryption (32+ chars) |
| `ADMIN_PASSWORD` | Staff admin portal + customer master login |

3. Create the database table:

```bash
npm run db:setup
```

Portal accounts are scoped per Trello board. Staff pick the active board from a dropdown in `/admin`.

4. Verify configuration:

```bash
npm run verify-auth
npm run verify-supabase
```

5. Run locally:

```bash
npm install
npm run dev
```

- Customer portal: http://localhost:3000/login
- Admin portal: http://localhost:3000/admin

## Admin workflow

1. Open `/admin` and sign in with `ADMIN_PASSWORD`
2. Select a Trello board, then generate PINs for POs on that board
3. Staff can preview any customer account on `/login` using the customer ID + `ADMIN_PASSWORD` in the PIN field

**Trello comments:** Staff talk freely on cards — those stay internal. To reply to a customer in the portal, start with `CUSTOMER · your message` (middle dot). Customer portal messages appear as `Customer · ...` in Trello.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:setup` | Apply Supabase schema |
| `npm run verify-auth` | Test Trello credentials (read-only) |
| `npm run verify-supabase` | Test Supabase + session config |

## Project structure

```
app/           Pages and API routes
components/    UI components
lib/           Trello, auth, Supabase, parsers
scripts/       Setup and verification utilities
supabase/      SQL schema
```
