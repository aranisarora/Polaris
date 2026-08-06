# Supabase setup

Four steps, in order. The Polaris project ref used below is
`qgvwvbigfurbmylraxzw` — substitute your own if it differs.

## 1. Apply the schema

Open the Supabase dashboard → **SQL Editor** → paste the entire contents of
[`schema.sql`](./schema.sql) → **Run**. This creates every table, all RLS
policies, the new-user trigger, the `claim_gemini_slot` throttle function, and
the private `cvs` storage bucket. The script is idempotent — re-running it is
safe, and re-running it is how schema changes reach an existing project.

**Already provisioned before the Gemini budget shipped?** Re-run the script.
`proxy.ts` calls `claim_gemini_slot` to hold each user to 6 Gemini-backed
requests per 60s (the shared free tier is ~10 req/min). If the function is
missing the check **fails open** — the app keeps working, but one user looping
`/api/cv/parse` or `/api/roadmap/generate` can exhaust the quota for everyone.
Verify it landed:

```sql
select public.claim_gemini_slot(6, 60);  -- false when run as a non-user role
```

## 2. Enable Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth client ID** (type: Web application).
2. Add this **Authorized redirect URI**:

   ```
   https://qgvwvbigfurbmylraxzw.supabase.co/auth/v1/callback
   ```

3. In the Supabase dashboard → **Authentication → Providers → Google**:
   enable the provider and paste the Google client ID and client secret.

## 3. Configure auth URLs

Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL**: your deployed origin (e.g. `https://polaris.example.com`);
  for local development, `http://localhost:3000`.
- **Additional redirect URLs**: add

  ```
  http://localhost:3000/auth/callback
  ```

  and, once deployed, `https://<your-domain>/auth/callback`.

## 4. Environment keys

Copy `.env.example` to `.env.local` and fill in (dashboard → **Project
Settings → API**):

| Key | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable (public) API key |
| `SUPABASE_SECRET_KEY` | Secret key — server-only, reserved; feature code never uses it |
| `NEXT_PUBLIC_SITE_URL` | Your app origin (`http://localhost:3000` locally) |

The remaining keys in `.env.example` (`GEMINI_API_KEY`, `JOOBLE_API_KEY`,
`ADZUNA_APP_ID`/`ADZUNA_APP_KEY`) are not Supabase-related. The job-provider
keys are optional: without them the reality check shows its designed
"the sky is quiet" state instead of results.
