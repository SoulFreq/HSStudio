# HigherSelfStudio

Sleek, moody Higher Self Studio site skeleton inspired by [higherselfstudio.co](https://higherselfstudio.co) with Neon-backed API stubs, Vercel routing, and all static pages served from `public/`.

## Project structure

```
├── api/                 # Vercel serverless functions (Neon-backed)
│   ├── courses.js       # Sample query for future program listings
│   ├── products.js      # Sample query for digital suite
│   └── waitlist.js      # Opt-in capture powered by Neon
├── public/              # Static marketing site
│   ├── assets/
│   │   ├── css/main.css # Luxury serif/sans styling, motion, gradients
│   │   └── js/main.js   # Scroll reveals, nav toggle, form stubs
│   ├── index.html       # Homepage — hero, framework, freebie, CTA
│   ├── about.html       # Val's hero journey + modality fusion
│   ├── programs.html    # Flagship program, digital suite, 1:1
│   ├── resources.html   # Sacred AF download + newsletter hub
│   └── contact.html     # Application-style inquiry form
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

- Wire the `cta-form` components (home, resources, programs) to `POST /api/waitlist` once the Neon table is live.
- Map the contact application form to a secure API endpoint or external CRM.
- Replace placeholder social URLs with live handles, swap the stock imagery, and embed brand assets.
- Add analytics, SEO meta expansions, and motion polish (GSAP/Framer Motion) as desired.
