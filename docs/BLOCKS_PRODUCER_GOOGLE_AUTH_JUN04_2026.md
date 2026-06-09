# BLOCKS Producer — Google Sign-In (Jun 04, 2026)

**Status:** Complete (code)  
**Site:** `https://blocks.mycodao.com` (MycoDAO — not mycosoft.com)

## Behavior

- Producer tab (`/blocks/?producer=1` or `#producer`) uses **Google OAuth** via Supabase.
- Session is **persisted in the browser** (`localStorage`, auto-refresh) until sign-out.
- **No magic link / email OTP** for producer login.
- Server still enforces an **email allowlist** after Google sign-in (`lib/server/producer-auth.ts`).

## Supabase dashboard (one-time)

Project: same Supabase used by MycoDAO (`NEXT_PUBLIC_SUPABASE_URL` on VM 198).

### 1. Google provider

**Authentication → Providers → Google**

- Enable Google
- Use Google Cloud OAuth client ID + secret (Web application)
- Authorized redirect URI in **Google Cloud Console** must include:
  - `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`

### 2. URL configuration (fixes redirect to mycosoft.com)

This project **shares** Supabase with mycosoft.com. **Site URL** stays `https://mycosoft.com` for the main site.

Producer OAuth **must** whitelist MycoDAO callbacks or Supabase sends users to Site URL with `?code=...` on **mycosoft.com** (broken).

**Authentication → URL Configuration → Redirect URLs** — add **exactly**:

```
https://blocks.mycodao.com/blocks/?producer=1
https://blocks.mycodao.com/blocks/**
http://localhost:3004/blocks/?producer=1
```

Optional if you serve Blocks on apex domain:

```
https://www.mycodao.com/blocks/?producer=1
https://mycodao.com/blocks/?producer=1
```

**Do not** remove mycosoft.com from Site URL — add MycoDAO URLs to **Redirect URLs** only.

Server env (VM `.env.production`):

```env
PRODUCER_OAUTH_REDIRECT_URL=https://blocks.mycodao.com/blocks/?producer=1
```

### 3. Email provider

Magic link is **not** used for producer. Email provider can stay on for other apps sharing the project.

## Allowlisted Google accounts

Default (override with `NEWS_PRODUCER_ALLOWED_EMAILS` on server):

- `morgan@mycosoft.org`
- `morgan@mycodao.com`
- `abelardo@mycosoft.org`
- `abelardo@mycodao.com`

Google must return one of these emails or producer APIs return 401.

## Verify

1. Open `https://blocks.mycodao.com/blocks/?producer=1`
2. **Continue with Google** → pick allowlisted account
3. Land back on producer dashboard with controls unlocked
4. Close tab, reopen same URL — should still be signed in (remember me)
5. **Sign out** clears session

## Deploy

Rebuild pulse + Next image on VM 198 after pull (`npm run build`, restart `mycodao-app`).

## Fix: “verify 500” after Google sign-in (Jun 09, 2026)

**Symptom:** Producer dashboard shows `verify 500` (controls locked) on Program or any tab after Google login.

**Cause:** Server `POST /api/news/producer/verify` could throw an unhandled error from `@supabase/supabase-js` `auth.getUser()` (network/SDK), which Next surfaced as HTTP 500.

**Fix (commit `355750e`):** `lib/server/producer-auth.ts` validates tokens via direct `GET /auth/v1/user` with try/catch, resolves Google email from `user_metadata` / identities, and returns **401** / **502** with a clear message instead of 500.

**If still blocked after deploy:** Sign out → hard refresh → sign in again. If you see “not authorized”, the Google account email is not on the allowlist — add it via `NEWS_PRODUCER_ALLOWED_EMAILS` on VM 198.

## Fix: local dev `verify 500` (Cut to URL / Program tab) — Jun 09, 2026

**Symptom:** On `localhost`, producer shows `verify 500` when signing in or using **Cut to URL** with a YouTube link.

**Cause:** `tailwind.config.js` scanned `./app/**/*`, including the embedded `app/natureapp/MYCO-App/` tree (its own `node_modules`). Tailwind’s extractor hit **Maximum call stack size exceeded**, which broke Next dev compilation — **all** `/api/*` routes returned HTML 500, not JSON.

**Fix:** Exclude embedded app and `node_modules` in `tailwind.config.js`:

```js
"!./app/natureapp/**",
"!./**/node_modules/**",
"!./public/blocks/**",
```

**Local run (both required for producer):**

| Process | Command | Port |
|---------|---------|------|
| Next API + Blocks | `npm run dev` in MYCODAO root | **3004** |
| Pulse UI (optional) | `npm run dev` in `myco-pulse/` | **3000** → API on 3004 |

After changing `tailwind.config.js`, **restart** Next on 3004. Quick check:

```powershell
curl -X POST http://127.0.0.1:3004/api/news/producer/verify -H "Authorization: Bearer test"
# Expect JSON 401, not HTML 500
```

Client now refreshes Supabase tokens before verify/PATCH (`myco-pulse/src/lib/producerSession.ts`) and shows a clear message if the API returns HTML instead of JSON.
