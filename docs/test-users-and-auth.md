# Test Users & Authentication Setup

## Environment Variables Required

Naberza OS Phase 0 uses **single-user credentials** authentication. No database required yet.

### Local Development

Copy `.env.local.example` and fill in:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# NEXTAUTH
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# Single-user admin (temporary, Phase 1 moves to DB)
AUTH_ADMIN_EMAIL=user@naberza.local
AUTH_ADMIN_PASSWORD=TestPassword123!

# Database connection (Phase 1)
DATABASE_URL=postgresql://naberza:postgres@localhost:5432/naberza_dev
```

Then start the app:

```bash
docker-compose up -d
# App at http://localhost:3000
```

Login with the credentials you set in `AUTH_ADMIN_EMAIL` and `AUTH_ADMIN_PASSWORD`.

---

## Staging (Pre-production) Environment

The project is deployed to **Vercel preview environment** from `develop` branch.

### Test User Credentials

Credentials are **not committed** to git (security). They're set in Vercel environment variables.

To get staging credentials:

1. **Check Vercel dashboard**:
   - Go to: https://vercel.com/micaelanon/naberza
   - Navigate to: Settings → Environment Variables
   - Look for: `AUTH_ADMIN_EMAIL` and `AUTH_ADMIN_PASSWORD`

2. **Access staging app**:
   - URL: Check the deployment preview in your PR or recent deployment
   - Typical format: `https://naberza-<branch>.vercel.app`
   - Login page: `/login`

3. **If credentials are not visible**:
   - Contact the project maintainer (Micael)
   - Or set new values in Vercel dashboard
   - Redeploy the `develop` branch

### Set Staging Credentials in Vercel

1. Go to **Settings** → **Environment Variables**
2. Add two variables:
   - **Name**: `AUTH_ADMIN_EMAIL` | **Value**: `admin@staging.naberza`
   - **Name**: `AUTH_ADMIN_PASSWORD` | **Value**: `<secure-password>`
3. Select environments: **Preview** + **Development**
4. Save and redeploy

---

## Production Environment

Phase 1+ will migrate to database-based authentication.

Credentials will be:
- User account in PostgreSQL
- Password hashed with bcrypt
- Email-based login or OAuth providers
- Session management via JWT

---

## Troubleshooting Login Issues

### "Invalid credentials"
- Check `AUTH_ADMIN_EMAIL` and `AUTH_ADMIN_PASSWORD` are set
- Verify no typos in email/password
- Check app logs: `docker-compose logs app`

### Session expires immediately
- Ensure `NEXTAUTH_SECRET` is set and consistent
- Check `NEXTAUTH_URL` matches your app URL
- Clear browser cookies and try again

### Login page shows error
- Check all env vars are present
- Review app logs: `docker-compose logs app`
- Try local dev first to isolate environment issues

---

## Login Flow

### UI Components

Located at: `code/src/app/(auth)/login/`

- `login.tsx`: Main page
- `login-form.tsx`: Form component with email/password fields
- `login.css`: Styling

### Authentication Logic

Located at: `code/src/lib/auth.ts`

- **Provider**: CredentialsProvider (temporary)
- **Session**: JWT strategy, 30-day expiry
- **Callbacks**: Token → Session mapping
- **Pages**: Sign-in at `/login`, errors redirect to `/login`

### Middleware

Located at: `code/src/middleware.ts`

- Protects all routes under `/dashboard`
- Redirects unauthenticated users to `/login`
- Maintains session across page navigation

---

## Phase 1: Database Authentication

When Phase 1 implements the inbox module:

1. **Migrate to PrismaAdapter**:
   - User data stored in PostgreSQL
   - Password hashing with bcrypt
   - Account creation flow

2. **Add features**:
   - Email verification
   - Password reset
   - Optional OAuth (Google, GitHub)
   - Multi-user support (optional)

3. **Update env vars**:
   - Remove: `AUTH_ADMIN_EMAIL`, `AUTH_ADMIN_PASSWORD`
   - Existing: `DATABASE_URL`, `NEXTAUTH_SECRET`

See `docs/roadmap.md` Phase 1 for timeline.

---

## Quick Reference

| Environment | URL | Creds | Type |
|---|---|---|---|
| Local | http://localhost:3000 | `.env.local` | CredentialsProvider |
| Staging (pre) | `vercel preview` | Vercel env vars | CredentialsProvider |
| Production (pro) | TBD | DB-based (Phase 1) | TBD |

For issues or questions, check:
- `CONTRIBUTING.md` - Development workflow
- `code/src/lib/auth.ts` - Auth configuration
- `docs/docker-setup.md` - Local environment setup
