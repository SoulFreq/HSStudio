# HigherSelfStudio

Professional, moody landing experience for HigherSelfStudio with a Vercel-ready structure, Neon database integration stubs, and static assets under `public/`.

## Project structure

```
├── api/                 # Vercel serverless functions (Neon-backed)
│   ├── courses.js
│   ├── products.js
│   └── waitlist.js
├── public/              # Static site served by Vercel
│   ├── assets/
│   │   ├── css/main.css
│   │   └── js/main.js
│   ├── account.html
│   ├── courses.html
│   ├── index.html
│   └── products.html
├── src/
│   └── lib/db.js        # Neon client helper + error boundary
├── package.json
├── vercel.json
└── README.md
```

## Local development

1. Install dependencies: `npm install`
2. Set the Neon connection string in `.env.local`:
   ```bash
   export NEON_DATABASE_URL="postgres://user:password@host/db"
   ```
3. Run locally with Vercel CLI: `vercel dev`

The static site is served from `public`, while API requests (e.g. `POST /api/waitlist`) hit the corresponding serverless functions.

## Deployment

- **Vercel**: Project is pre-configured via `vercel.json` to ship static assets and Node functions.
- **GitHub**: Push this repository to `https://github.com/SoulFreq/HigherSelfStudio` and connect Vercel to build from `main`.
- **Neon DB**: Create the following tables (example schema) to align with the handlers:
  ```sql
  create table if not exists waitlist_subscribers (
    id bigserial primary key,
    email text unique not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz
  );

  create table if not exists digital_products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text unique not null,
    hero_copy text,
    price numeric(10,2),
    status text default 'draft',
    created_at timestamptz default now()
  );

  create table if not exists courses (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    cohort_type text,
    duration_weeks integer,
    enrollment_status text,
    position integer default 0
  );
  ```

## Next steps

- Hook the `cta-form` submission on `index.html` to `POST /api/waitlist`.
- Replace placeholder links with production product/course slugs.
- Add analytics, payment integrations, and auth providers as needed.
- Layer in automated deployments (GitHub Actions) to preview branches on Vercel.
