# CampusRoomLynk — Project Instructions for Claude

## 1. Project Overview

CampusRoomLynk is a web-based accommodation platform initially targeting students around Kabale University in Uganda.

The platform connects:

- **Students:** Find, compare and enquire about accommodation.
- **Landlords:** Register hostels/properties and manage their rooms.
- **Boda-boda riders:** Support students with transportation and directions to accommodation.
- **Administrators:** Manage platform operations, approvals, users and disputes.
- **Field agents:** Help verify properties and accommodation information.

The long-term goal is to develop a reliable, scalable accommodation platform that can expand beyond Kabale.

## 2. Important Development Principles

Follow these rules throughout development:

1. Do not delete existing files, folders, components or features without first explaining why and receiving permission.
2. Do not replace working implementations with new ones unnecessarily.
3. Inspect the relevant existing code before modifying it.
4. Make changes in small, logical steps.
5. Preserve existing functionality when introducing new features.
6. Avoid unnecessary dependencies and complicated architecture.
7. Do not create duplicate components, services or configuration files.
8. Do not change the technology stack without permission.
9. Explain important changes and identify the files affected.
10. Run appropriate checks after making changes and fix errors introduced by your work.
11. Do not assume that a feature is complete just because its interface has been created.
12. Ask before making major architectural, database or security changes.

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

- SQLite is currently used for local development.
- Prisma manages database access and models.

Do not migrate the database or introduce another database without permission.

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

This is an overview. Always inspect the actual project before assuming a file or directory exists.

## 5. Main Platform Requirements

### A. Landlords

- Landlords register using their personal details and property information.
- A landlord account requires administrator approval before publishing properties.
- A landlord can own and manage multiple properties or hostels.
- Landlord can upload free rooms, and once the room is booked he should mark it booked ,it should be out of listings.
- Landlords should manage their own room information.
- They should be able to add, update, mark as occupied, reserve or remove rooms.
- Once a landlord has been approved, their new room listings should not require individual administrator approval.

### B. Students

Students should be able to:

- Browse available rooms.
- Search for accommodation.
- Filter by rent, room type, location, facilities and availability.
- View property and room details.
- View property images and relevant location information.
- Contact landlords or submit enquiries.
- Request accommodation viewing.
- Save favourite rooms.
- cannot book more than one room(s)
- one room cannot be booked by more than one student(s)
- Manage booking requests.

### C. Boda-boda Riders

The platform should support registered boda-boda riders who can help students reach accommodation locations.

The rider system should be developed with appropriate account registration, verification and privacy controls.

### D. Administrators

Administrators should be able to:

- Review and approve landlord registrations.
- Manage users and platform accounts.
- Monitor properties and room listings.
- Manage complaints and disputes.
- Monitor bookings and payments.
- Access relevant platform activity and audit records.

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
- Occupied
- Maintenance
- Unavailable

Maintain the relationship between landlords, properties and rooms in the database.

## 7. Images and Property Verification

The intended platform should support capturing property and room photos directly through the application.

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

Before implementing wallet or blockchain functionality, explain the proposed architecture, security implications, transaction model and costs, then seek approval.

Never expose private keys or sensitive payment credentials in frontend code.

Never treat a screenshot as proof of a successful payment.

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

Do not reset, delete or recreate the database unless explicitly authorized.

## 11. Git and GitHub

The project repository is:

[https://github.com/KENNETH-ARYATUHA/Roomlynk](https://github.com/KENNETH-ARYATUHA/Roomlynk)

The main branch is:

`main`

Before committing:

1. Inspect the changed files.
2. Check that no `.env`, database, private key or other sensitive files are staged.
3. Run relevant builds or tests.
4. Explain the changes before committing and pushing.

Never force-push, rewrite Git history or delete branches without permission.

## 12. How to Work With the Developer

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

**Most importantly: preserve the existing working CampusRoomLynk application. Build on what already exists rather than unnecessarily rebuilding it.**
