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

  create(data: { shiftId: string; requesterId: string; receiverId: string }) {
    return prisma.swapRequest.create({
      data: { ...data, status: "PENDING_ACCEPTANCE" },
      include: { shift: true, requester: true, receiver: true },
    });
  },

  updateStatus(
    id: string,
    status: SwapStatus,
    extra?: { managerApprovedBy?: string; managerApprovedAt?: Date; cancelledAt?: Date; cancelReason?: string }
  ) {
    return prisma.swapRequest.update({
      where: { id },
      data: { status, ...extra },
      include: { shift: true, requester: true, receiver: true },
    });
  },

  cancelByShiftId(shiftId: string, reason: string) {
    return prisma.swapRequest.updateMany({
      where: { shiftId, status: { in: PENDING_STATUSES } },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
    });
  },
};
