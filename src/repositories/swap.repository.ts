import { PrismaClient, SwapStatus } from "@prisma/client";

const prisma = new PrismaClient();

const PENDING_STATUSES: SwapStatus[] = ["PENDING_ACCEPTANCE", "PENDING_APPROVAL"];

export const swapRepository = {
  findById(id: string) {
    return prisma.swapRequest.findUnique({
      where: { id },
      include: {
        shift: { include: { location: true, skill: true } },
        requester: true,
        receiver: true,
      },
    });
  },

  findByShiftAndRequester(shiftId: string, requesterId: string) {
    return prisma.swapRequest.findUnique({
      where: { shiftId_requesterId: { shiftId, requesterId } },
      include: { shift: true, requester: true, receiver: true },
    });
  },

  findPendingByRequester(requesterId: string) {
    return prisma.swapRequest.findMany({
      where: { requesterId, status: { in: PENDING_STATUSES } },
      include: { shift: { include: { location: true, skill: true } }, receiver: true },
    });
  },

  findPendingByReceiver(receiverId: string) {
    return prisma.swapRequest.findMany({
      where: { receiverId, status: { in: PENDING_STATUSES } },
      include: { shift: { include: { location: true, skill: true } }, requester: true },
    });
  },

  findByRequester(requesterId: string, limit = 50) {
    return prisma.swapRequest.findMany({
      where: { requesterId },
      include: {
        shift: { include: { location: true, skill: true } },
        receiver: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  findByReceiver(receiverId: string, limit = 50) {
    return prisma.swapRequest.findMany({
      where: { receiverId },
      include: {
        shift: { include: { location: true, skill: true } },
        requester: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  findApprovedByManager(managerId: string, limit = 50) {
    return prisma.swapRequest.findMany({
      where: { managerApprovedBy: managerId, status: "APPROVED" },
      include: {
        shift: { include: { location: true, skill: true } },
        requester: true,
        receiver: true,
      },
      orderBy: { managerApprovedAt: "desc" },
      take: limit,
    });
  },

  countPendingByRequester(requesterId: string) {
    return prisma.swapRequest.count({
      where: { requesterId, status: { in: PENDING_STATUSES } },
    });
  },

  findPendingByShiftId(shiftId: string) {
    return prisma.swapRequest.findMany({
      where: { shiftId, status: { in: PENDING_STATUSES } },
    });
  },

  findPendingApprovalForApprover(locationIds: string[] | null) {
    return prisma.swapRequest.findMany({
      where: {
        status: "PENDING_APPROVAL",
        ...(locationIds !== null && locationIds.length > 0
          ? { shift: { locationId: { in: locationIds } } }
          : {}),
      },
      include: {
        shift: { include: { location: true, skill: true } },
        requester: true,
        receiver: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  create(data: { shiftId: string; requesterId: string; receiverId: string }) {
    return prisma.swapRequest.create({
      data: { ...data, status: "PENDING_ACCEPTANCE" },
      include: { shift: true, requester: true, receiver: true },
    });
  },

  updateStatus(
    id: string,
    status: SwapStatus,
    extra?: {
      managerApprovedBy?: string;
      managerApprovedAt?: Date;
      managerRejectedBy?: string;
      managerRejectedAt?: Date;
      cancelledAt?: Date;
      cancelReason?: string;
    }
  ) {
    return prisma.swapRequest.update({
      where: { id },
      data: { status, ...extra },
      include: { shift: true, requester: true, receiver: true },
    });
  },

  findResolvedInScope(locationIds: string[] | null, limit = 100) {
    return prisma.swapRequest.findMany({
      where: {
        status: { in: ["APPROVED", "REJECTED"] },
        ...(locationIds !== null && locationIds.length > 0
          ? { shift: { locationId: { in: locationIds } } }
          : {}),
      },
      // Cast: Prisma generated SwapRequestInclude can omit optional relations; 
      // schema defines managerApprovedByUser/managerRejectedByUser
      include: {
        shift: { include: { location: true, skill: true } },
        requester: true,
        receiver: true,
        managerApprovedByUser: true,
        managerRejectedByUser: true,
      } as Record<string, unknown>,
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
  },

  cancelByShiftId(shiftId: string, reason: string) {
    return prisma.swapRequest.updateMany({
      where: { shiftId, status: { in: PENDING_STATUSES } },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
    });
  },
};
