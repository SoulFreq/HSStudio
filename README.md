# HigherSelfStudio

Sleek, moody Higher Self Studio site skeleton inspired by [higherselfstudio.co](https://higherselfstudio.co) with Neon-backed API stubs, Vercel routing, and all static pages served from `public/`.

## Project structure

```
├── api/                 # Vercel serverless functions (Neon-backed)
│   ├── admin/
│   │   ├── products.js  # Admin CRUD with token auth
│   │   ├── stats.js     # Dashboard metrics endpoint
│   │   └── users.js     # Admin CRUD with token auth
│   ├── auth/
│   │   ├── login.js     # Email/password login issuing signed session tokens
│   │   ├── profile.js   # Returns authenticated member profile + purchases
│   │   └── register.js  # Member registration with encrypted password storage
│   ├── courses.js       # Sample query for future program listings
│   ├── products.js      # Sample query for digital suite
│   └── waitlist.js      # Opt-in capture powered by Neon
├── public/              # Static marketing site
│   ├── assets/
│   │   ├── css/main.css # Luxury serif/sans styling, motion, gradients
│   │   └── js/
│   │       ├── admin.js # Control panel tabs, inline CRUD, token gate
│   │       ├── auth.js  # Login/register/account flows + session sync
│   │       └── main.js  # Scroll reveals, nav toggle, form stubs, nav auth state
│   ├── index.html       # Homepage — hero, framework, freebie, CTA
│   ├── about.html       # Val's hero journey + modality fusion
│   ├── programs.html    # Flagship program, digital suite, 1:1
│   ├── resources.html   # Sacred AF download + newsletter hub
│   ├── contact.html     # Application-style inquiry form
│   ├── login.html       # Member sign-in portal
│   ├── register.html    # Member registration experience
│   ├── account.html     # Authenticated member dashboard
│   └── admin.html       # Token-gated control panel (users, products, stats)
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
3. Provide secrets for privileged API requests:
   ```bash
   export ADMIN_TOKEN="super-secret-string"
   export SESSION_SECRET="replace-with-long-random-string"
   ```
4. Run locally with Vercel CLI: `vercel dev`

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

  create table if not exists studio_users (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    email text unique not null,
    is_admin boolean default false,
    password_hash text not null,
    password_salt text not null,
    created_at timestamptz default now(),
    updated_at timestamptz,
    last_login_at timestamptz
  );

  create table if not exists product_orders (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references studio_users(id) on delete cascade,
    product_id uuid references digital_products(id) on delete cascade,
    quantity integer default 1,
    amount numeric(10,2) not null,
    created_at timestamptz default now()
  );
  ```

## Next steps

- Wire the `cta-form` components (home, resources, programs) to `POST /api/waitlist` once the Neon table is live.
- Map the contact application form to a secure API endpoint or external CRM.
- Replace placeholder social URLs with live handles, swap the stock imagery, and embed brand assets.
- Add analytics, SEO meta expansions, and motion polish (GSAP/Framer Motion) as desired.
- Seed `studio_users`, `digital_products`, and `product_orders` with production data so the admin dashboard has real insight out of the gate.
- Rotate the `ADMIN_TOKEN` whenever access changes and share it via a secure channel only with trusted operators.
- Wire up password reset + email delivery so members can self-serve credential changes.
