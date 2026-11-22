# Campus RoomLynk

Accommodation platform for university students around Kabale University, Uganda.
Students find rooms, landlords register hostels and manage rooms, and administrators approve
landlords and monitor the platform. Project rules and requirements: see [CLAUDE.md](CLAUDE.md).

**Stack:** React + TypeScript + Vite (PWA) / Node.js + Express + TypeScript / Prisma / PostgreSQL

## Folders

| Folder | What it holds |
|---|---|
| ` src/` | The React website (feature folders: `features/auth`, `student`, `landlord`, `admin`) |
| `server/` | The Express API |
| `server/prisma/` | The database design (`schema.prisma`), the migration history (`migrations/`) and demo data (`seed.ts`) |

## First-time setup (Windows PowerShell)

You need Node.js, Git and PostgreSQL 18 (the EDB installer from postgresql.org).
Use `npm.cmd` and `npx.cmd` so PowerShell's script policy does not get in the way.

**1. Create the database and a dedicated app user** (not the `postgres` administrator)

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost
```

At the `postgres=#` prompt, type the lines below. `\password` asks for the new password
without showing it. A generated one works well:
`node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"`

```sql
CREATE ROLE roomlynk_app WITH LOGIN CREATEDB;
\password roomlynk_app
CREATE DATABASE roomlynk OWNER roomlynk_app;
\q
```

**2. The API**

```powershell
cd server
npm.cmd install
Copy-Item .env.example .env
```

Open `server\.env` and set `DATABASE_URL` (put the app password in) and `JWT_SECRET`
(`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Then:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

The API runs on http://localhost:3000 (check http://localhost:3000/api/health).

**3. The website** (a second terminal, from the project root)

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://localhost:5173.

## Demo logins (after `npm.cmd run db:seed`)

Log in with the phone number. In development the 6-digit code is shown on the verify page
and printed in the API terminal (SMS is not connected yet).

| Phone | Role |
|---|---|
| 0700000001 | Administrator |
| 0700000002 | Approved landlord (has rooms) |
| 0700000003 | Landlord pending approval (its room must stay hidden from students) |
| 0700000004 | Student |

## Changing the database structure

1. Edit `server/prisma/schema.prisma`.
2. From the `server` folder run `npm.cmd run db:migrate -- --name short_description_of_change`.
3. Commit the new folder that appears in `server/prisma/migrations/`.

Never edit a migration that has been committed. Never reset or delete the database, or run any
destructive command, without explicit permission (see CLAUDE.md). On a real server, apply
migrations with `npm.cmd run db:deploy`.

## Checks before committing

```powershell
npm.cmd run lint
npm.cmd run build
cd server
npm.cmd run typecheck
```

Never commit `.env` files or database files.