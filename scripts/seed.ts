import { PrismaClient, Role, ScheduleState } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "password123";

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function runSeed(): Promise<void> {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

  await prisma.user.upsert({
    where: { email: "admin@coastaleats.com" },
    update: {},
    create: {
      email: "admin@coastaleats.com",
      passwordHash: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: Role.ADMIN,
    },
  });

  const locations = await Promise.all([
    prisma.location.upsert({
      where: { id: "loc-pacific-1" },
      update: {},
      create: {
        id: "loc-pacific-1",
        name: "Coastal Eats Downtown",
        address: "123 Ocean Ave, San Francisco, CA",
        timezone: "America/Los_Angeles",
      },
    }),
    prisma.location.upsert({
      where: { id: "loc-pacific-2" },
      update: {},
      create: {
        id: "loc-pacific-2",
        name: "Coastal Eats Marina",
        address: "456 Harbor Blvd, San Francisco, CA",
        timezone: "America/Los_Angeles",
      },
    }),
    prisma.location.upsert({
      where: { id: "loc-eastern-1" },
      update: {},
      create: {
        id: "loc-eastern-1",
        name: "Coastal Eats Miami Beach",
        address: "789 Beach Dr, Miami, FL",
        timezone: "America/New_York",
      },
    }),
    prisma.location.upsert({
      where: { id: "loc-eastern-2" },
      update: {},
      create: {
        id: "loc-eastern-2",
        name: "Coastal Eats Brickell",
        address: "321 Brickell Ave, Miami, FL",
        timezone: "America/New_York",
      },
    }),
  ]);

  const manager = await prisma.user.upsert({
    where: { email: "manager@coastaleats.com" },
    update: {},
    create: {
      email: "manager@coastaleats.com",
      passwordHash: hashedPassword,
      firstName: "Manager",
      lastName: "One",
      role: Role.MANAGER,
    },
  });

  await prisma.managerLocation.upsert({
    where: {
      userId_locationId: { userId: manager.id, locationId: locations[0].id },
    },
    update: {},
    create: {
      userId: manager.id,
      locationId: locations[0].id,
    },
  });

  const skills = await Promise.all([
    prisma.skill.upsert({
      where: { name: "bartender" },
      update: {},
      create: { name: "bartender" },
    }),
    prisma.skill.upsert({
      where: { name: "line cook" },
      update: {},
      create: { name: "line cook" },
    }),
    prisma.skill.upsert({
      where: { name: "server" },
      update: {},
      create: { name: "server" },
    }),
    prisma.skill.upsert({
      where: { name: "host" },
      update: {},
      create: { name: "host" },
    }),
  ]);

  const staff1 = await prisma.user.upsert({
    where: { email: "staff1@coastaleats.com" },
    update: {},
    create: {
      email: "staff1@coastaleats.com",
      passwordHash: hashedPassword,
      firstName: "Sarah",
      lastName: "Server",
      role: Role.STAFF,
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: "staff2@coastaleats.com" },
    update: {},
    create: {
      email: "staff2@coastaleats.com",
      passwordHash: hashedPassword,
      firstName: "John",
      lastName: "Cook",
      role: Role.STAFF,
    },
  });

  await prisma.staffLocationCertification.createMany({
    data: [
      { userId: staff1.id, locationId: locations[0].id },
      { userId: staff1.id, locationId: locations[1].id },
      { userId: staff2.id, locationId: locations[0].id },
    ],
    skipDuplicates: true,
  });

  await prisma.staffSkill.createMany({
    data: [
      { userId: staff1.id, skillId: skills[2].id },
      { userId: staff2.id, skillId: skills[1].id },
    ],
    skipDuplicates: true,
  });

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(17, 0, 0, 0);

  const shiftEnd = new Date(nextWeek);
  shiftEnd.setHours(23, 0, 0, 0);

  const sampleShift = await prisma.shift.upsert({
    where: { id: "shift-sample-1" },
    update: {},
    create: {
      id: "shift-sample-1",
      locationId: locations[0].id,
      skillId: skills[2].id,
      startAt: nextWeek,
      endAt: shiftEnd,
      headcountRequired: 2,
      scheduleState: ScheduleState.DRAFT,
    },
  });

  await prisma.shiftAssignment.upsert({
    where: {
      shiftId_userId: { shiftId: sampleShift.id, userId: staff1.id },
    },
    update: {},
    create: {
      shiftId: sampleShift.id,
      userId: staff1.id,
      assignedBy: manager.id,
    },
  });

  console.log("Seed complete. Test accounts (password: password123):");
  console.log("  Admin:   admin@coastaleats.com");
  console.log("  Manager: manager@coastaleats.com");
  console.log("  Staff:   staff1@coastaleats.com, staff2@coastaleats.com");
}
