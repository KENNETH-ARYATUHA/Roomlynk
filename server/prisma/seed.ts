// Fills the database with demo data so you can try every screen straight away.
// Run with:  npm run db:seed        (safe to run more than once)
//
// Demo logins (phone numbers — the OTP code is printed in the server console):
//   0700000001  admin
//   0700000002  approved landlord  (has 3 rooms)
//   0700000003  PENDING landlord   (has 1 published room that must stay HIDDEN)
//   0700000004  student

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // upsert = "update if it exists, otherwise create" → makes seeding repeatable.
  await prisma.user.upsert({
    where: { phone: '0700000001' },
    update: {},
    create: { phone: '0700000001', fullName: 'Demo Admin', role: 'admin', phoneVerifiedAt: new Date() },
  });

  await prisma.user.upsert({
    where: { phone: '0700000004' },
    update: {},
    create: { phone: '0700000004', fullName: 'Demo Student', role: 'student', phoneVerifiedAt: new Date() },
  });

  // ── Approved landlord with a hostel and rooms ──
  const approved = await prisma.user.upsert({
    where: { phone: '0700000002' },
    update: {},
    create: {
      phone: '0700000002',
      fullName: 'Grace Tumusiime',
      role: 'landlord',
      phoneVerifiedAt: new Date(),
      landlordProfile: {
        create: {
          hostelName: 'Rwamukundi Heights',
          district: 'Kabale',
          area: 'Rwamukundi',
          address: 'Near the main gate',
          accountStatus: 'approved',
          reviewedAt: new Date(),
        },
      },
    },
    include: { landlordProfile: true },
  });

  const approvedProfile = approved.landlordProfile!;
  let property = await prisma.property.findFirst({ where: { landlordProfileId: approvedProfile.id } });
  if (!property) {
    property = await prisma.property.create({
      data: {
        landlordProfileId: approvedProfile.id,
        name: 'Rwamukundi Heights',
        district: 'Kabale',
        area: 'Rwamukundi',
        address: 'Near the main gate',
        latitude: -1.2493,
        longitude: 29.9899,
      },
    });
    await prisma.room.createMany({
      data: [
        {
          propertyId: property.id, label: 'A1', roomType: 'Single', capacity: 1, price: 250000,
          deposit: 50000, description: 'Bright single room with a desk and window.',
          facilities: JSON.stringify(['Water', 'Electricity', 'Wi-Fi']),
          status: 'available', listingStatus: 'published',
        },
        {
          propertyId: property.id, label: 'A2', roomType: 'Self-contained', capacity: 1, price: 400000,
          deposit: 100000, description: 'Own bathroom and small kitchenette.',
          facilities: JSON.stringify(['Water', 'Electricity', 'Private bathroom']),
          status: 'available', listingStatus: 'published',
        },
        {
          // Occupied: must NOT appear in student search (doc §5.2).
          propertyId: property.id, label: 'A3', roomType: 'Shared', capacity: 2, price: 150000,
          description: 'Shared room for two students.',
          status: 'occupied', listingStatus: 'published',
        },
        {
          // Draft: only the landlord can see it.
          propertyId: property.id, label: 'B1', roomType: 'Single', capacity: 1, price: 280000,
          description: 'Still being prepared.',
          status: 'available', listingStatus: 'draft',
        },
      ],
    });
  }

  // ── Pending landlord: their room is "published" but MUST be invisible ──
  const pending = await prisma.user.upsert({
    where: { phone: '0700000003' },
    update: {},
    create: {
      phone: '0700000003',
      fullName: 'Peter Mugisha',
      role: 'landlord',
      phoneVerifiedAt: new Date(),
      landlordProfile: {
        create: { hostelName: 'Kikungiri Lodge', district: 'Kabale', area: 'Kikungiri', address: 'Behind the market' },
      },
    },
    include: { landlordProfile: true },
  });

  const pendingProfile = pending.landlordProfile!;
  const pendingProp = await prisma.property.findFirst({ where: { landlordProfileId: pendingProfile.id } });
  if (!pendingProp) {
    const p = await prisma.property.create({
      data: { landlordProfileId: pendingProfile.id, name: 'Kikungiri Lodge', district: 'Kabale', area: 'Kikungiri' },
    });
    await prisma.room.create({
      data: {
        propertyId: p.id, label: 'R1', roomType: 'Single', price: 200000,
        description: 'You should NOT see this as a student until the landlord is approved.',
        status: 'available', listingStatus: 'published',
      },
    });
  }

  console.log('Seed complete. See the comment at the top of prisma/seed.ts for demo logins.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
