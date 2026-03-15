import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const assignmentRepository = {
  findById(id: string) {
    return prisma.shiftAssignment.findUnique({
      where: { id },
      include: { shift: { include: { location: true, skill: true } }, user: true },
    });
  },

  findByShiftId(shiftId: string) {
    return prisma.shiftAssignment.findMany({
      where: { shiftId },
      include: { user: true, shift: true },
    });
  },

  findByUserId(userId: string, startDate?: Date, endDate?: Date) {
    const where: { userId: string; shift?: { startAt?: { gte: Date }; endAt?: { lte: Date } } } = { userId };
    if (startDate || endDate) {
      where.shift = {};
      if (startDate) where.shift.startAt = { gte: startDate };
      if (endDate) where.shift.endAt = { lte: endDate };
    }
    return prisma.shiftAssignment.findMany({
      where,
      include: { shift: { include: { location: true, skill: true } }, user: true },
      orderBy: { shift: { startAt: "asc" } },
    });
  },

  findByShiftAndUser(shiftId: string, userId: string) {
    return prisma.shiftAssignment.findUnique({
      where: { shiftId_userId: { shiftId, userId } },
      include: { shift: true, user: true },
    });
  },

  create(data: { shiftId: string; userId: string; assignedBy?: string }) {
    return prisma.shiftAssignment.create({
      data,
      include: { shift: true, user: true },
    });
  },

  delete(shiftId: string, userId: string) {
    return prisma.shiftAssignment.delete({
      where: { shiftId_userId: { shiftId, userId } },
    });
  },

  countByShiftId(shiftId: string) {
    return prisma.shiftAssignment.count({ where: { shiftId } });
  },

  findActiveNow(locationId?: string) {
    const now = new Date();
    const where = {
      shift: {
        startAt: { lte: now },
        endAt: { gte: now },
        ...(locationId && { locationId }),
      },
    };
    return prisma.shiftAssignment.findMany({
      where,
      include: { user: true, shift: { include: { location: true, skill: true } } },
    });
  },
};
