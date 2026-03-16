import { Role } from "@prisma/client";
import { swapRepository } from "../repositories/swap.repository";
import { assignmentRepository } from "../repositories/assignment.repository";
import { userRepository } from "../repositories/user.repository";
import { constraintService } from "./constraint.service";
import { notificationService } from "./notification.service";
import { auditService } from "./audit.service";
import { emitSwapStateChange } from "../sockets/io";
import type { CreateSwapBody } from "../types/api";

const MAX_PENDING_SWAP_DROP = 3;

export const swapService = {
  async create(requesterId: string, body: CreateSwapBody) {
    const pendingCount = await swapRepository.countPendingByRequester(requesterId);
    if (pendingCount >= MAX_PENDING_SWAP_DROP) {
      return { success: false, error: "Maximum pending swap/drop requests reached" };
    }

    const assignment = await assignmentRepository.findByShiftAndUser(body.shiftId, requesterId);
    if (!assignment) return { success: false, error: "You are not assigned to this shift" };

    const violation = await constraintService.checkAssignment(body.shiftId, body.receiverId);
    if (violation) return { success: false, error: violation.message };

    const swap = await swapRepository.create({
      shiftId: body.shiftId,
      requesterId,
      receiverId: body.receiverId,
    });
    const requester = await userRepository.findById(requesterId);
    await notificationService.notifySwapRequest(
      body.receiverId,
      swap.id,
      requester?.firstName,
      requester?.lastName
    );
    emitSwapStateChange([requesterId, body.receiverId], { swapId: swap.id, status: swap.status });
    return { success: true, swap };
  },

  async accept(swapId: string, receiverId: string) {
    const swap = await swapRepository.findById(swapId);
    if (!swap || swap.receiverId !== receiverId) return null;
    if (swap.status !== "PENDING_ACCEPTANCE") return null;

    const updated = await swapRepository.updateStatus(swapId, "PENDING_APPROVAL");
    await notificationService.notifySwapAccepted(swap.requesterId, swapId);
    const managerIds = await userRepository.getAdminAndManagerIdsForLocation(swap.shift.locationId);
    await notificationService.notifyManagersSwapPendingApproval(
      managerIds,
      swapId,
      swap.requester.firstName,
      swap.requester.lastName,
      swap.receiver.firstName,
      swap.receiver.lastName
    );
    emitSwapStateChange([swap.requesterId, swap.receiverId], { swapId, status: updated.status });
    return updated;
  },

  async reject(swapId: string, receiverId: string, reason?: string) {
    const swap = await swapRepository.findById(swapId);
    if (!swap || swap.receiverId !== receiverId) return null;
    if (swap.status !== "PENDING_ACCEPTANCE") return null;

    const updated = await swapRepository.updateStatus(swapId, "REJECTED", {
      cancelledAt: new Date(),
      cancelReason: reason,
    });
    await notificationService.notifySwapRejected(swap.requesterId, swapId);
    emitSwapStateChange([swap.requesterId, swap.receiverId], { swapId, status: updated.status });
    return updated;
  },

  async approveByManager(swapId: string, managerId: string) {
    const swap = await swapRepository.findById(swapId);
    if (!swap || swap.status !== "PENDING_APPROVAL") return null;

    const updated = await swapRepository.updateStatus(swapId, "APPROVED", {
      managerApprovedBy: managerId,
      managerApprovedAt: new Date(),
    });
    await assignmentRepository.delete(swap.shiftId, swap.requesterId);
    await assignmentRepository.create({
      shiftId: swap.shiftId,
      userId: swap.receiverId,
      assignedBy: managerId,
    });
    await auditService.log("SwapRequest", swapId, "APPROVED", managerId, swap as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
    await notificationService.notifySwapApproved(swap.requesterId, swap.receiverId, swapId);
    emitSwapStateChange([swap.requesterId, swap.receiverId], { swapId, status: updated.status });
    return updated;
  },

  async rejectByManager(swapId: string, managerId: string, reason?: string) {
    const swap = await swapRepository.findById(swapId);
    if (!swap || swap.status !== "PENDING_APPROVAL") return null;

    const updated = await swapRepository.updateStatus(swapId, "REJECTED", {
      cancelledAt: new Date(),
      cancelReason: reason,
      managerRejectedBy: managerId,
      managerRejectedAt: new Date(),
    });
    await notificationService.notifySwapRejectedByManager(swap.requesterId, swap.receiverId, swapId);
    emitSwapStateChange([swap.requesterId, swap.receiverId], { swapId, status: updated.status });
    return updated;
  },

  async cancelByRequester(swapId: string, requesterId: string) {
    const swap = await swapRepository.findById(swapId);
    if (!swap || swap.requesterId !== requesterId) return null;
    if (swap.status !== "PENDING_ACCEPTANCE" && swap.status !== "PENDING_APPROVAL") return null;

    const updated = await swapRepository.updateStatus(swapId, "CANCELLED", {
      cancelledAt: new Date(),
      cancelReason: "Cancelled by requester",
    });
    await notificationService.notifySwapCancelled(swap.requesterId, swap.receiverId, swapId, "Cancelled by requester");
    emitSwapStateChange([swap.requesterId, swap.receiverId], { swapId, status: updated.status });
    return updated;
  },

  async getMyRequests(userId: string, userRole: Role) {
    const isApprover = userRole === Role.ADMIN || userRole === Role.MANAGER;
    const [initiated, received, pendingApproval, approvedByMe, history] = await Promise.all([
      swapRepository.findByRequester(userId),
      swapRepository.findByReceiver(userId),
      userRole === Role.ADMIN
        ? swapRepository.findPendingApprovalForApprover(null)
        : userRole === Role.MANAGER
          ? userRepository.getManagerLocationIds(userId).then((ids) =>
              ids.length > 0 ? swapRepository.findPendingApprovalForApprover(ids) : []
            )
          : Promise.resolve([]),
      isApprover ? swapRepository.findApprovedByManager(userId) : Promise.resolve([]),
      userRole === Role.ADMIN
        ? swapRepository.findResolvedInScope(null)
        : userRole === Role.MANAGER
          ? userRepository.getManagerLocationIds(userId).then((ids) =>
              ids.length > 0 ? swapRepository.findResolvedInScope(ids) : []
            )
          : Promise.resolve([]),
    ]);
    return {
      initiated,
      received,
      pendingApproval: pendingApproval ?? [],
      approvedByMe: approvedByMe ?? [],
      history: history ?? [],
    };
  },

  async cancelPendingByShiftId(shiftId: string, reason: string) {
    const pending = await swapRepository.findPendingByShiftId(shiftId);
    for (const s of pending as Array<{ id: string; requesterId: string; receiverId: string }>) {
      await notificationService.notifySwapCancelled(s.requesterId, s.receiverId, s.id, reason);
    }
    const userIds = new Set<string>();
    pending.forEach((s: { requesterId: string; receiverId: string }) => {
      userIds.add(s.requesterId);
      userIds.add(s.receiverId);
    });
    await swapRepository.cancelByShiftId(shiftId, reason);
    if (userIds.size > 0) {
      emitSwapStateChange(Array.from(userIds), { shiftId, status: "CANCELLED", reason });
    }
  },
};
