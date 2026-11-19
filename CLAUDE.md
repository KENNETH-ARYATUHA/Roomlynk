# CampusRoomLynk — Project Instructions for Claude

## 1. Project Overview

CampusRoomLynk is a web-based accommodation platform initially targeting students around Kabale University in Uganda.

The platform connects:

- **Students:** Find, compare and enquire about accommodation.
- **Landlords:** Register hostels/properties and manage their rooms.
- **Boda-boda riders:** Support students with transportation and directions to accommodation.
- **Administrators:** Manage platform operations, approvals, users and disputes.
- **Field agents:** Help verify properties and accommodation information.

The long-term goal is to develop a reliable, scalable accommodation platform that can expand beyond Kabale and eventually serve other universities and communities.

## 2. Important Development Principles

Follow these rules throughout development:

1. Do not delete existing files, folders, components or features without first explaining why and receiving permission.
2. Do not replace working implementations with new ones unnecessarily.
3. Inspect the relevant existing code before modifying it.
4. Make changes in small, logical steps.
5. Preserve existing functionality when introducing new features.
6. Avoid unnecessary dependencies and complicated architecture.
7. Do not create duplicate components, services or configuration files.
8. Do not change the approved technology stack without permission.
9. Explain important changes and identify the files affected.
10. Run appropriate checks after making changes and fix errors introduced by your work.
11. Do not assume that a feature is complete just because its interface has been created.
12. Ask before making major architectural, database or security changes.
13. Never perform destructive database operations without explicit permission.
14. Do not independently develop in a separate sandbox and provide ZIP files as the normal development workflow.

The developer is still learning. Explanations should be clear, practical and beginner-friendly.

## 3. Technology Stack

### Frontend

- React
- TypeScript
- Vite
- CSS
- React Router
- Progressive Web App (PWA) support

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM

### Database

- **PostgreSQL is the approved database for CampusRoomLynk.**
- Prisma ORM manages database access, models and migrations.
- PostgreSQL should be used for both local development and production.
- SQLite is the previous development database and is being replaced.
- Do not revert to SQLite or introduce another database without permission.
- Use Prisma migrations to manage database schema changes.
- Preserve existing data during the SQLite-to-PostgreSQL migration wherever possible.
- Never reset or delete an existing database without explicit permission.

### Database Migration

The migration from SQLite to PostgreSQL is authorised.

However:

1. First inspect the existing Prisma schema, SQLite database, environment configuration, seed scripts and backend database code.
2. Identify SQLite-specific implementation details and compatibility issues.
3. Determine whether the existing SQLite database contains data that must be preserved.
4. Explain the proposed migration process before implementing it.
5. Identify the required changes to Prisma configuration and database models.
6. Guide the developer through PostgreSQL installation or setup.
7. Configure the PostgreSQL connection securely.
8. Apply appropriate Prisma migrations.
9. Verify the connection, database schema and application functionality.
10. Keep the original SQLite database untouched until migration and verification are complete and the developer approves its archival or removal.

Do not use `prisma migrate reset`, `prisma db push --force-reset`, or other destructive commands without explicit permission.

Do not assume that changing the Prisma provider and DATABASE_URL alone completes a safe data migration.

## 4. Existing Project Structure

The project currently uses a feature-based frontend structure.

```text
Roomlynk/
├── public/
├── src/
│   ├── app/
│   │   ├── providers/
│   │   └── routes/
│   ├── components/
│   │   ├── common/
│   │   └── ui/
│   ├── features/
│   │   ├── auth/
│   │   ├── student/
│   │   ├── landlord/
│   │   └── admin/
│   ├── lib/
│   ├── pages/
│   ├── services/
│   ├── types/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── phase1.css
├── server/
│   ├── prisma/
│   ├── src/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── app.ts
│   │   ├── config.ts
│   │   ├── db.ts
│   │   └── index.ts
│   ├── package.json
│   └── .env.example
├── package.json
├── vite.config.ts
└── CLAUDE.md
```

This is an overview. Always inspect the actual project before assuming a file or directory exists. The actual project structure takes precedence over this illustrative structure.

## 5. Main Platform Requirements

### A. Landlords

- Landlords register using their personal details and property information.
- A landlord account requires administrator approval before publishing properties.
- A landlord can own and manage multiple properties or hostels.
- Landlords can create and manage room listings under their properties.
- Landlords can update room information and availability.
- Landlords can mark rooms as occupied, reserved, under maintenance or unavailable.
- When a room becomes booked or occupied, it must no longer appear among available room listings.
- Once a landlord has been approved, their new room listings should not require individual administrator approval.
- Landlords should have access only to properties and rooms they are authorised to manage.

### B. Students

Students should be able to:

- Register and authenticate securely.
- Browse available rooms.
- Search for accommodation.
- Filter by rent, room type, location, facilities and availability.
- View property and room details.
- View property images and relevant location information.
- Contact landlords or submit enquiries.
- Request accommodation viewing.
- Save favourite rooms.
- Submit and manage booking requests.
- View booking status and relevant payment information.

**Booking restrictions:**

- A student must not have more than one active room booking at a time.
- A room must not have more than one active student booking at a time.
- These restrictions must be enforced by the backend and database where appropriate, not only by frontend validation.
- Booking operations must handle concurrent requests safely.
- Cancelled, expired or completed bookings should follow clearly defined lifecycle rules.

### C. Boda-boda Riders

The platform should support registered boda-boda riders who can help students reach accommodation locations.

The rider system should be developed with appropriate account registration, verification and privacy controls.

Do not implement continuous location tracking without explicit approval.

### D. Administrators

Administrators should be able to:

- Review and approve landlord registrations.
- Manage users and platform accounts.
- Monitor properties and room listings.
- Manage complaints and disputes.
- Monitor bookings and payments.
- Manage and monitor field agents.
- Access relevant platform activity and audit records.

### E. Field Agents

Field agents should help verify property information and report findings to administrators.

Property verification should be recorded and traceable.

## 6. Property and Room Management

A property belongs to a landlord.

A property can contain multiple rooms. Do not design the system as though every room is an independent hostel.

Room information may include:

- Room label or number.
- Room type.
- Capacity.
- Rent.
- Billing period.
- Deposit and other charges.
- Facilities.
- Rules.
- Availability status.

Possible room statuses include:

- Available
- Reserved
- Occupied
- Maintenance
- Unavailable

Maintain the relationship between landlords, properties and rooms in the database.

Room availability must be consistent with booking information. Do not allow a room to remain publicly available when it has been successfully booked or occupied.

## 7. Images and Property Verification

The intended platform should support capturing property and room photos directly through the application rather than relying entirely on gallery uploads.

The system should consider:

- Captured image information.
- Upload timestamp.
- Uploading user.
- Associated property or room.
- File integrity information.
- Location information where permission is granted.

Do not claim that timestamps or GPS alone prove that a photo is genuine.

Respect user privacy. Do not implement continuous location tracking without explicit approval.

## 8. Booking and Payments

The platform will eventually need a reliable booking and payment system.

Booking functionality should consider:

- Booking requests.
- Confirmation.
- Expiry.
- Cancellation.
- Room availability updates.
- Payment records.
- Receipts.
- Refunds and disputes.

The long-term product vision includes wallet functionality and possible blockchain integration.

However, do not assume that every rent payment must use cryptocurrency or blockchain.

Before implementing wallet or blockchain functionality, explain the proposed architecture, security implications, transaction model, costs and relevant compliance considerations, then seek approval.

Never expose private keys or sensitive payment credentials in frontend code.

Never treat a screenshot as proof of a successful payment.

Payment operations should support secure transaction records, backend verification, idempotency and reconciliation.

## 9. Security Requirements

- Use secure authentication.
- Protect private routes.
- Enforce authorization on the backend.
- Validate incoming data.
- Use secure password handling.
- Protect sensitive environment variables.
- Never commit `.env` files.
- Do not expose JWT secrets or database credentials.
- Avoid trusting frontend role checks as the only authorization mechanism.
- Use appropriate error handling.
- Avoid exposing sensitive information in API responses.
- Protect database access credentials.
- Use appropriate transaction handling for important operations such as bookings and payments.
- Apply database constraints and indexes where appropriate.

## 10. Development Commands

Run commands from the correct directory.

### Frontend

From the project root:

```powershell
npm.cmd run dev
```

Build:

```powershell
npm.cmd run build
```

### Backend

From the `server` directory:

```powershell
npm.cmd run dev
```

Build:

```powershell
npm.cmd run build
```

### Database

Use Prisma commands appropriate to the approved PostgreSQL configuration.

Before running migrations or database commands:

- Confirm the correct database environment.
- Understand whether the command changes the schema or data.
- Never reset, delete or recreate the database without explicit authorization.
- Prefer controlled Prisma migrations for schema changes.

Do not assume a database command is safe merely because it is commonly used in development.

## 11. Git and GitHub

The project repository is:

https://github.com/KENNETH-ARYATUHA/Roomlynk

The main branch is:

`main`

Before committing:

1. Inspect the changed files.
2. Check that no `.env`, database, private key or other sensitive files are staged.
3. Run relevant builds or tests.
4. Explain the changes before committing and pushing.
5. Never force-push, rewrite Git history or delete branches without permission.

GitHub is used to store and share the project. The developer's actual development environment is VS Code on Windows, using:

`C:\Users\PC\Desktop\Roomlynk`

Do not assume that GitHub is the developer's local working environment.

## 12. How to Work With the Developer

The developer wants to build CampusRoomLynk while learning software development.

The preferred workflow is:

1. Inspect the existing GitHub repository to understand the project.
2. Explain the proposed task and why it is needed.
3. Identify the exact files that need to be created or modified.
4. Provide the necessary code directly in the conversation.
5. Explain what the code does and how it connects to the rest of the application.
6. Give clear Windows PowerShell commands where necessary.
7. Let the developer apply the changes in their local VS Code project.
8. Wait for the developer to test the changes and share the results.
9. Troubleshoot errors before moving to the next task.
10. Review and verify changes before updating GitHub.

Additional rules:

- Do not create ZIP files or packaged project downloads as the normal delivery method.
- Do not independently modify a separate sandbox copy and ask the developer to replace their local project with it.
- Do not claim to have accessed or modified local files unless that access actually exists.
- Provide complete replacement code when a file needs substantial changes.
- For small changes, show exactly what to add, remove or replace and where.
- Give one development task at a time.
- Do not overwhelm the developer with multiple unrelated tasks.
- Do not ask the developer to repeat information already provided.
- Ask before making major changes or assumptions.
- Avoid unnecessary folder creation, deletion and restructuring.

The developer prefers:

- Step-by-step explanations.
- Small and understandable code changes.
- Practical examples.
- Proper comments where useful.
- Minimal unnecessary dependencies.
- Clear instructions on which files to edit.
- PowerShell commands compatible with Windows.
- No unnecessary creation or deletion of folders.
- No large unexplained changes.

When working on a feature:

1. Understand the requirement.
2. Inspect the existing implementation.
3. Explain the proposed changes briefly.
4. Implement the feature without breaking existing functionality.
5. Run the appropriate checks.
6. Explain what changed and how to test it.
7. Identify any remaining work.

If something is unclear, ask before making assumptions.

**Most importantly: preserve the existing working CampusRoomLynk application. Build on what already exists rather than unnecessarily rebuilding it. Help the developer understand and implement the system one step at a time.**