# Shvya API

Node/Express API for the Shvya AI CRM.

## Local setup

1. Start PostgreSQL and create a database named `shvya`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and a strong `JWT_SECRET`.
3. Apply `sql/001_init.sql` to the database.
4. From the repository root run `pnpm install`.
5. Run `pnpm --filter @shvya/api dev`.

The API listens on `http://localhost:4000` by default.

## Endpoints

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/leads?q=`
- `POST /api/leads`
- `GET /api/leads/:id`
- `PATCH /api/leads/:id`
- `GET /api/leads/:id/timeline`
- `POST /api/leads/:id/activities`
- WebSocket: `ws://localhost:4000/realtime?token=<JWT>`

All CRM resources are scoped by `organization_id` from the authenticated JWT. This is the base isolation model for the multi-tenant SaaS architecture.
