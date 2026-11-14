# CampusRoomLynk — Phase 1 (Foundation + Landlord Verification)

Matches doc sections 2, 3.1, 3.3, 5.2 (data model), 9.1 (admin queue), 16 (server-side gating, audit log).

## 1. Folder structure (what's new ★ / changed ✎)

```
Roomlynk/                         ← your existing repo
├── .env                          ✗ DELETE (old Cloudinary placeholders; committed by mistake)
├── .env.example                  ★
├── .gitignore                    ✎ add the 4 lines in step 2
├── server/                       ★ NEW — the backend (its own package.json)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example              → copy to server/.env
│   ├── .gitignore
│   ├── prisma/
│   │   ├── schema.prisma         ← the database design
│   │   └── seed.ts               ← demo data
│   └── src/
│       ├── index.ts              ← starts the server
│       ├── app.ts                ← wires middleware + routes
│       ├── config.ts             ← reads .env
│       ├── db.ts                 ← Prisma connection
│       ├── lib/        errors.ts  otp.ts  audit.ts  serialize.ts
│       ├── middleware/ auth.ts  errorHandler.ts
│       └── routes/     auth.ts  landlord.ts  admin.ts  rooms.ts
└── src/                          ← frontend
    ├── App.tsx                   ✎
    ├── main.tsx                  ✎ (imports phase1.css)
    ├── phase1.css                ★
    ├── types/index.ts            ✎
    ├── lib/apiClient.ts          ✎
    ├── lib/roles.ts              ★
    ├── context/AuthContext.tsx   ✎
    ├── components/Navbar.tsx     ✎
    ├── components/RoomCard.tsx   ✎
    └── pages/
        ├── Welcome.tsx           ✎
        ├── ComingSoon.tsx        ★
        ├── auth/   Register.tsx ✎   Login.tsx ★   VerifyOtp.tsx ✎
        ├── student/ RoomDetail.tsx ✎  MyBookings.tsx ✎   (BrowseRooms.tsx unchanged)
        ├── landlord/ LandlordDashboard.tsx ✎   ListingForm.tsx ✗ DELETE
        └── admin/  AdminDashboard.tsx ✎
```

Delete `src/pages/landlord/ListingForm.tsx`: it used a gallery file picker, which the doc forbids. Phase 2 replaces it with the in-app camera.

## 2. Frontend setup

```bash
git rm --cached .env      # stop tracking the old .env
del .env                  # (Mac/Linux: rm .env)
```
Add to `.gitignore`:
```
# Secrets
.env
.env.*
!.env.example
```

## 3. Backend setup (one time)

```bash
cd server
npm install
copy .env.example .env          # Mac/Linux: cp .env.example .env
```
Open `server/.env` and set `JWT_SECRET`. Generate one:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Then create the database and demo data:
```bash
npx prisma db push      # creates server/prisma/dev.db AND generates the typed client
npm run db:seed
npm run dev             # API on http://localhost:3000
```
Check it: open http://localhost:3000/api/health → `{"ok":true}`

## 4. Run the app (two terminals)

```bash
# terminal 1
cd server && npm run dev
# terminal 2 (repo root)
npm run dev             # http://localhost:5173
```

## 5. Try it (the OTP code is shown on the verify page in dev AND printed in the server terminal)

| Log in as | Phone | What to check |
|---|---|---|
| Student | 0700000004 | Browse shows 2 rooms (A1, A2). NOT A3 (occupied), B1 (draft) or R1 (landlord unapproved). |
| Admin | 0700000001 | "Landlord Reviews" → Pending tab → Kikungiri Lodge. Approve it. |
| Student again | 0700000004 | Room R1 now appears. Suspend the landlord → it disappears again. |
| New landlord | register at /register | Lands on "under review". Admin: Request changes with a reason → landlord edits & resubmits. |

The key lesson is that R1 is `published` in the database but invisible. The rule lives in the server query (`server/src/routes/rooms.ts`), not in React.

## 6. Where to read first (suggested learning order)

1. `server/prisma/schema.prisma`: the data model from the doc.
2. `server/src/routes/auth.ts`: OTP login/registration.
3. `server/src/middleware/auth.ts`: how the server knows who you are.
4. `server/src/routes/admin.ts`: the approval "state machine".
5. `server/src/routes/rooms.ts`: server-side gating.
6. `src/context/AuthContext.tsx` → `src/pages/auth/*` → `src/pages/admin/AdminDashboard.tsx`.

## 7. Known gaps (deliberate, for later)

- OTP is printed, not texted: connect an SMS provider (e.g. Africa's Talking).
- Admin MFA and "second review for high-risk cases" (doc §16): not yet.
- Add `express-rate-limit` before going public.
- `public/icons/icon-192.png` and `icon-512.png` (referenced by the PWA manifest) don't exist yet: add them or installing the PWA will warn.
- Optional: in `vite.config.ts` change the manifest `description` (it still says "direct student-landlord housing marketplace").
- Database is SQLite for easy learning. Move to PostgreSQL (doc §13) by changing `provider` and `DATABASE_URL`.
