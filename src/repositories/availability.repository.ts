import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const availabilityRepository = {
  findRecurringByUserId(userId: string) {
    return prisma.availabilityRecurring.findMany({
      where: { userId },
      orderBy: { dayOfWeek: "asc" },
    });
  },

  findExceptionsByUserId(userId: string, startDate?: Date, endDate?: Date) {
    const where: { userId: string; date?: { gte?: Date; lte?: Date } } = { userId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }
    return prisma.availabilityException.findMany({
      where,
      orderBy: { date: "asc" },
    });
  },

  upsertRecurring(userId: string, dayOfWeek: number, data: { startTime: string; endTime: string; timezone: string }) {
    return prisma.availabilityRecurring.upsert({
      where: { userId_dayOfWeek: { userId, dayOfWeek } },
      create: { userId, dayOfWeek, ...data },
      update: data,
    });
  },

  setRecurringBulk(userId: string, windows: Array<{ dayOfWeek: number; startTime: string; endTime: string; timezone: string }>) {
    return prisma.$transaction([
      prisma.availabilityRecurring.deleteMany({ where: { userId } }),
      ...windows.map((w) =>
        prisma.availabilityRecurring.create({
          data: { userId, ...w },
        })
      ),
    ]);
  },

  upsertException(userId: string, date: Date, data: { isAvailable: boolean; startTime?: string; endTime?: string; timezone: string }) {
    return prisma.availabilityException.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, ...data },
      update: data,
    });
  },

  findDesiredHours(userId: string) {
    return prisma.desiredHours.findUnique({ where: { userId } });
  },

  upsertDesiredHours(userId: string, data: { minHours?: number | null; maxHours?: number | null }) {
    return prisma.desiredHours.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },
};
