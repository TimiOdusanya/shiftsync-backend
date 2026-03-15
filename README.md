# ShiftSync Backend

API and realtime server for shift scheduling: managers build and publish schedules, staff get assigned, and swap/drop requests go through approval. Built with Express, TypeScript, Prisma (PostgreSQL), and Socket.IO.

**Requirements:** Node 18+, PostgreSQL.

## Setup

Clone the repo, then:

1. Copy `.env.example` to `.env` and set your database URL, JWT secret (long random string), and any overrides. Do not commit `.env`.

2. Install and generate the Prisma client:
   ```bash
   npm install
   npx prisma generate
   ```

3. Create the database and apply the schema:
   ```bash
   npx prisma db push
   ```
   Or use `npx prisma migrate dev` if you prefer migrations.

4. (Optional) Seed test data: `npm run db:seed`

## Running

- **Development:** `npm run dev` — nodemon + tsx, restarts on file change.
- **Production:** `npm run build` then `npm start`.

Server listens on the port in `.env` (default 4000). HTTP request logs go to the console.

## API

Base path: **`/api`**.

| Path | Purpose |
|------|--------|
| `/api/auth` | Login, refresh token |
| `/api/users` | Users (filter by role/location) |
| `/api/locations` | Locations CRUD |
| `/api/skills` | Skills CRUD |
| `/api/shifts` | Shifts (create, update, publish/unpublish, list by location/date) |
| `/api/assignments` | Assign staff to shifts, list active assignments |
| `/api/swaps` | Request/accept/reject swap requests |
| `/api/drops` | Drop shifts, claim open drops |
| `/api/notifications` | User notifications |
| `/api/analytics` | Fairness and distribution |
| `/api/audit` | Audit log export |
| `/api/health` | Liveness check |

Auth is JWT (Bearer). Roles: ADMIN, MANAGER, STAFF. Managers are scoped to locations; staff are scoped to locations and skills.

## Realtime

Socket.IO is mounted on the same server. Clients can subscribe to `schedule:subscribe` / `on-duty:subscribe` with a `locationId` to receive schedule and on-duty updates for that location.
