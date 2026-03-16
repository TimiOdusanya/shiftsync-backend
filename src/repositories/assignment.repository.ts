import { PrismaClient, ScheduleState } from "@prisma/client";

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

  findActiveNow(locationId?: string, allowedLocationIds?: string[] | null) {
    const now = new Date();
    const shiftWhere: {
      startAt: { lte: Date };
      endAt: { gte: Date };
      scheduleState: ScheduleState;
      locationId?: string | { in: string[] };
    } = {
      startAt: { lte: now },
      endAt: { gte: now },
      scheduleState: ScheduleState.PUBLISHED,
    };
    if (locationId) {
      shiftWhere.locationId = locationId;
    } else if (Array.isArray(allowedLocationIds) && allowedLocationIds.length > 0) {
      shiftWhere.locationId = { in: allowedLocationIds };
    }
    return prisma.shiftAssignment.findMany({
      where: { shift: shiftWhere },
      include: { user: true, shift: { include: { location: true, skill: true } } },
    });
  },
};
