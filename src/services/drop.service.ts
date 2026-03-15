import { dropRepository } from "../repositories/drop.repository";
import { assignmentRepository } from "../repositories/assignment.repository";
import { constraintService } from "./constraint.service";
import { notificationService } from "./notification.service";
import { auditService } from "./audit.service";
import { emitDropClaimed } from "../sockets/io";

const MAX_PENDING_SWAP_DROP = 3;
const DROP_EXPIRY_HOURS_BEFORE = 24;

export const dropService = {
  async create(shiftId: string, userId: string) {
    const pendingCount = await dropRepository.countPendingByUserId(userId);
    if (pendingCount >= MAX_PENDING_SWAP_DROP) {
      return { success: false, error: "Maximum pending swap/drop requests reached" };
    }

    const assignment = await assignmentRepository.findByShiftAndUser(shiftId, userId);
    if (!assignment) return { success: false, error: "You are not assigned to this shift" };

    const shift = await assignment.shift;
    const expiresAt = new Date(shift.startAt);
    expiresAt.setHours(expiresAt.getHours() - DROP_EXPIRY_HOURS_BEFORE);

    if (expiresAt <= new Date()) {
      return { success: false, error: "Drop window has expired" };
    }

    const drop = await dropRepository.create({ shiftId, userId, expiresAt });
    await notificationService.notifyDropCreated(shiftId, drop.id);
    return { success: true, drop };
  },

  async claim(dropRequestId: string, userId: string) {
    const drop = await dropRepository.findById(dropRequestId);
    if (!drop || drop.status !== "OPEN") return null;
    if (drop.expiresAt <= new Date()) {
      await dropRepository.updateStatus(dropRequestId, "EXPIRED");
      return null;
    }

    const violation = await constraintService.checkAssignment(drop.shiftId, userId);
    if (violation) return { success: false, error: violation.message };

    await dropRepository.createPickup(dropRequestId, userId);
    const updated = await dropRepository.updateStatus(dropRequestId, "CLAIMED_PENDING_APPROVAL", {
      claimedBy: userId,
      claimedAt: new Date(),
    });
    await notificationService.notifyDropClaimed(drop.userId, dropRequestId);
    emitDropClaimed(drop.userId, { dropRequestId, status: updated.status });
    return { success: true, drop: updated };
  },

  async approveByManager(dropRequestId: string, managerId: string) {
    const drop = await dropRepository.findById(dropRequestId);
    if (!drop || drop.status !== "CLAIMED_PENDING_APPROVAL" || !drop.claimedBy) return null;

    await assignmentRepository.delete(drop.shiftId, drop.userId);
    await assignmentRepository.create({
      shiftId: drop.shiftId,
      userId: drop.claimedBy,
      assignedBy: managerId,
    });
    const updated = await dropRepository.updateStatus(dropRequestId, "APPROVED", {
      managerApprovedBy: managerId,
      managerApprovedAt: new Date(),
    });
    await auditService.log("DropRequest", dropRequestId, "APPROVED", managerId, drop as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
    await notificationService.notifyDropApproved(drop.userId, drop.claimedBy, dropRequestId);
    return updated;
  },

  async rejectByManager(dropRequestId: string, _managerId: string) {
    const drop = await dropRepository.findById(dropRequestId);
    if (!drop || drop.status !== "CLAIMED_PENDING_APPROVAL") return null;
    const updated = await dropRepository.updateStatus(dropRequestId, "CANCELLED", { cancelledAt: new Date() });
    emitDropClaimed(drop.userId, { dropRequestId, status: "CANCELLED" });
    return updated;
  },

  async listOpen(locationId?: string) {
    if (locationId) return dropRepository.findOpenByLocation(locationId);
    return dropRepository.findOpen();
  },

  async getMyDrops(userId: string) {
    return dropRepository.findPendingByUserId(userId);
  },

  expireStale() {
    return dropRepository.markExpired();
  },

  async cancelPendingByShiftId(shiftId: string) {
    const pending = await dropRepository.findPendingByShiftId(shiftId);
    const reason = "Shift was edited.";
    for (const d of pending as Array<{ id: string; userId: string }>) {
      await notificationService.notifyDropCancelled(d.userId, d.id, reason);
    }
    await dropRepository.cancelByShiftId(shiftId);
    for (const d of pending) {
      emitDropClaimed(d.userId, { shiftId, status: "CANCELLED" });
    }
  },
};
