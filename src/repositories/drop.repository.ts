import { PrismaClient, DropStatus } from "@prisma/client";

const prisma = new PrismaClient();

export const dropRepository = {
  findById(id: string) {
    return prisma.dropRequest.findUnique({
      where: { id },
      include: {
        shift: { include: { location: true, skill: true } },
        user: true,
        pickup: true,
      },
    });
  },

  findByShiftAndUser(shiftId: string, userId: string) {
    return prisma.dropRequest.findUnique({
      where: { shiftId_userId: { shiftId, userId } },
      include: { shift: true, user: true, pickup: true },
    });
  },

  findOpen(limit = 50) {
    return prisma.dropRequest.findMany({
      where: { status: "OPEN", expiresAt: { gt: new Date() } },
      include: { shift: { include: { location: true, skill: true } }, user: true },
      orderBy: { expiresAt: "asc" },
      take: limit,
    });
  },

  findOpenByLocation(locationId: string) {
    return prisma.dropRequest.findMany({
      where: {
        status: "OPEN",
        expiresAt: { gt: new Date() },
        shift: { locationId },
      },
      include: { shift: { include: { location: true, skill: true } }, user: true },
    });
  },

  findPendingByUserId(userId: string) {
    return prisma.dropRequest.findMany({
      where: { userId, status: { in: ["OPEN", "CLAIMED_PENDING_APPROVAL"] } },
      include: { shift: { include: { location: true, skill: true } } },
    });
  },

  countPendingByUserId(userId: string) {
    return prisma.dropRequest.count({
      where: { userId, status: { in: ["OPEN", "CLAIMED_PENDING_APPROVAL"] } },
    });
  },

  create(data: { shiftId: string; userId: string; expiresAt: Date }) {
    return prisma.dropRequest.create({
      data: { ...data, status: "OPEN" },
      include: { shift: true, user: true },
    });
  },

  updateStatus(
    id: string,
    status: DropStatus,
    extra?: { claimedBy?: string; claimedAt?: Date; managerApprovedBy?: string; managerApprovedAt?: Date; cancelledAt?: Date }
  ) {
    return prisma.dropRequest.update({
      where: { id },
      data: { status, ...extra },
      include: { shift: true, user: true, pickup: true },
    });
  },

  createPickup(dropRequestId: string, userId: string) {
    return prisma.shiftPickup.create({
      data: { dropRequestId, userId },
    });
  },

  findPendingByShiftId(shiftId: string) {
    return prisma.dropRequest.findMany({
      where: { shiftId, status: { in: ["OPEN", "CLAIMED_PENDING_APPROVAL"] } },
      include: { shift: true, user: true },
    });
  },

  cancelByShiftId(shiftId: string) {
    return prisma.dropRequest.updateMany({
      where: { shiftId, status: { in: ["OPEN", "CLAIMED_PENDING_APPROVAL"] } },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
  },

  markExpired(shiftId?: string) {
    const where: { status: "OPEN"; expiresAt: { lt: Date }; shiftId?: string } = {
      status: "OPEN",
      expiresAt: { lt: new Date() },
    };
    if (shiftId) where.shiftId = shiftId;
    return prisma.dropRequest.updateMany({
      where,
      data: { status: "EXPIRED" },
    });
  },
};
