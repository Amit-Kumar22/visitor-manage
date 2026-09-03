# Visitor Management System

A visitor management system for office reception, built with Next.js (App Router), MongoDB, and Tailwind CSS.

## Features

- **Kiosk check-in form** (`/`) — large-tap-target visitor form with live camera photo capture (no gallery access), auto-resets after each submission.
- **Role-based admin panel** (`/admin`) — two roles:
  - **Guard**: view visitors, mark exit time.
  - **Admin**: everything a guard can do, plus edit/delete visitor records and manage user accounts.
- Search, filter (purpose/date), sort, and paginate visitor records.
- Responsive sidebar navigation (drawer on mobile, static on desktop).

## Tech stack

- Next.js 16 (App Router, Route Handlers as the API layer)
- MongoDB + Mongoose
- Tailwind CSS v4
- Custom JWT + httpOnly cookie auth (no third-party auth library)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your own values
npm run dev
```

App runs on `http://localhost:3009`.

## Environment variables

See `.env.example` for the full list. Notably:

- `ADMIN_PASSWORD` must be a **bcrypt hash**, not plain text — generate one with:
  ```bash
  node -e "console.log(require('bcrypt').hashSync('yourPassword', 10))"
  ```
  Escape every `$` in the hash as `\$` when pasting into a `.env*` file — Next.js's env-variable expansion otherwise mangles it.
- `ADMIN_EMAIL`/`ADMIN_PASSWORD` only seed the **first** admin account on first run; after that, manage users from the admin panel's Users page.
