import { Prisma, Role } from "@prisma/client";
import { dropRepository } from "../repositories/drop.repository";
import { assignmentRepository } from "../repositories/assignment.repository";
import { userRepository } from "../repositories/user.repository";
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

    const existingDrop = await dropRepository.findByShiftAndUser(shiftId, userId);
    if (existingDrop) {
      if (
        existingDrop.status === "OPEN" ||
        existingDrop.status === "CLAIMED_PENDING_APPROVAL"
      ) {
        return { success: false, error: "You already have a drop request for this shift" };
      }
      if (existingDrop.status === "CANCELLED" || existingDrop.status === "EXPIRED") {
        const drop = await dropRepository.reopen(existingDrop.id, expiresAt);
        const locationId = drop.shift?.locationId ?? shift.locationId;
        if (locationId) await notificationService.notifyDropCreated(shiftId, drop.id, locationId);
        return { success: true, drop };
      }
      return {
        success: false,
        error: "A drop request for this shift already exists. Withdraw any open request first.",
      };
    }

    try {
      const drop = await dropRepository.create({ shiftId, userId, expiresAt });
      const locationId = drop.shift?.locationId;
      if (locationId) await notificationService.notifyDropCreated(shiftId, drop.id, locationId);
      return { success: true, drop };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const existing = await dropRepository.findByShiftAndUser(shiftId, userId);
        if (existing && (existing.status === "CANCELLED" || existing.status === "EXPIRED")) {
          const drop = await dropRepository.reopen(existing.id, expiresAt);
          const locationId = drop.shift?.locationId;
          if (locationId) await notificationService.notifyDropCreated(shiftId, drop.id, locationId);
          return { success: true, drop };
        }
        return {
          success: false,
          error: "You already have a drop request for this shift",
        };
      }
      throw err;
    }
  },

  async claim(dropRequestId: string, userId: string) {
    const drop = await dropRepository.findById(dropRequestId);
    if (!drop || drop.status !== "OPEN") return null;
    if (drop.expiresAt <= new Date()) {
      await dropRepository.updateStatus(dropRequestId, "EXPIRED");
      return null;
    }
    if (drop.userId === userId) {
      return { success: false, error: "You cannot claim your own drop request" };
    }

    const violation = await constraintService.checkAssignment(drop.shiftId, userId);
    if (violation) return { success: false, error: violation.message };

    await dropRepository.createPickup(dropRequestId, userId);
    const updated = await dropRepository.updateStatus(dropRequestId, "CLAIMED_PENDING_APPROVAL", {
      claimedBy: userId,
      claimedAt: new Date(),
    });
    const claimer = await userRepository.findById(userId);
    await notificationService.notifyDropClaimed(
      drop.userId,
      dropRequestId,
      claimer?.firstName,
      claimer?.lastName
    );
    const locationId = drop.shift?.locationId;
    if (locationId) {
      const managerIds = await userRepository.getAdminAndManagerIdsForLocation(locationId);
      await notificationService.notifyManagersDropClaimed(
        managerIds,
        dropRequestId,
        claimer?.firstName,
        claimer?.lastName
      );
    }
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

  /** Owner withdraws their drop request while it is still OPEN (no one has claimed yet). They keep the shift. */
  async cancelByOwner(dropRequestId: string, userId: string) {
    const drop = await dropRepository.findById(dropRequestId);
    if (!drop) return null;
    if (drop.userId !== userId) return { success: false, error: "You can only withdraw your own drop request" };
    if (drop.status !== "OPEN") return { success: false, error: "Only open drop requests can be withdrawn" };
    const updated = await dropRepository.updateStatus(dropRequestId, "CANCELLED", { cancelledAt: new Date() });
    return { success: true, drop: updated };
  },

  async listOpen(locationId?: string) {
    if (locationId) return dropRepository.findOpenByLocation(locationId);
    return dropRepository.findOpen();
  },

  async listPendingApproval(userRole: Role, userId: string, locationId?: string) {
    if (locationId) return dropRepository.findPendingApprovalByLocation(locationId);
    if (userRole === Role.MANAGER) {
      const locationIds = await userRepository.getManagerLocationIds(userId);
      return dropRepository.findPendingApprovalByLocations(locationIds);
    }
    return dropRepository.findPendingApproval();
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
