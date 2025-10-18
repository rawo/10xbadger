# 10xbadger

[![version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://github.com/)
[![node](https://img.shields.io/badge/node-22.14.0-brightgreen.svg)](https://nodejs.org/)
[![package manager](https://img.shields.io/badge/package%20manager-pnpm-%2300b4ab.svg)](https://pnpm.io/)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

## Table of Contents
- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Project description
Badger is a web application (MVP) that replaces legacy Excel and Confluence-based badge tracking with a single system for cataloging badges, submitting badge applications, and building promotion submissions. It focuses on core flows for engineers and administrators: catalog browsing and search, drafting and submitting badge applications, administrative review, promotion building and submission, and basic role-based access via Google Workspace SSO.

See the full Product Requirements Document at `/.ai/prd.md`.

## Tech stack
- **Frontend:** Astro 5, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui
- **Backend:** Supabase (Postgres, auth, SDKs)
- **AI (optional):** Openrouter.ai
- **CI/CD & Hosting:** GitHub Actions, DigitalOcean (Docker)
- **Tooling:** pnpm, ESLint, Prettier, Husky, lint-staged

Key package versions (from `package.json`): `astro` ^5.14.5, `react` ^19.2.0, `tailwindcss` ^4.1.14

## Getting started locally
### Prerequisites
- Node.js matching `.nvmrc` (v22.14.0). Use `nvm`:
  - `nvm install 22.14.0`
  - `nvm use 22.14.0`
- pnpm (recommended): `npm i -g pnpm`
- Supabase project (for full backend functionality)
- Google Workspace admin access (for SSO configuration)

### Quickstart
1. Clone the repository:
   - `git clone <repo-url>`
   - `cd 10xbadger`
2. Install dependencies:
   - `pnpm install`
3. Create environment variables
   - The project currently does not include an `.env.example`. You will likely need:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY` (or service role key)
     - OIDC / Google SSO client id / secret
4. Run the dev server:
   - `pnpm dev`
5. Build for production:
   - `pnpm build`
6. Preview the production build locally:
   - `pnpm preview`

## Available scripts
Defined in `package.json`:
- `pnpm dev` — Run the local development server (Astro)
- `pnpm build` — Build the production site
- `pnpm preview` — Preview the production build locally
- `pnpm astro` — Run the local Astro CLI
- `pnpm lint` — Run ESLint across the repo
- `pnpm lint:fix` — Run ESLint with `--fix`
- `pnpm format` — Run Prettier to format files

## Project scope
### In-scope (MVP core features)
- Google Workspace SSO (domain-restricted) for authentication and role-based access
- Badge Catalog (CRUD for admins; active-only search/filter)
- Badge Applications (draft, submit, admin review)
- Promotion Templates & Builder (template validation; reservation of badges)
- Reservation & Concurrency handling (optimistic reservation; HTTP 409 structured errors)
- Admin review workflows for badge applications and promotions
- Logging for auth failures and reservation conflicts

### Out of scope (MVP)
- Mobile application
- File attachments on badge applications
- Notifications (email/in-app)
- Detailed audit/history and change logs
- Bulk approvals
- Comments / social features
- Automatic import/migration tooling from Excel/Confluence
- Fine-grained admin role hierarchy and multi-tenancy

## Project status
- Status: MVP (requirements defined in `/.ai/prd.md`)
- What exists in repo:
  - Astro-based frontend skeleton with sample components
  - `package.json` with dev/build/lint/format scripts
  - `/.ai/prd.md` and `/.ai/tech-stack.md` documentation
- Next steps / TODOs:
  - Add `.env.example` and document environment variables
  - Document Supabase DB setup, migrations, and seed scripts
  - Implement Google Workspace SSO setup guide
  - Add CI workflow and deployment docs
  - Add CONTRIBUTING.md and code of conduct

## License
This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
