import { notificationRepository } from "../repositories/notification.repository";
import { emitNotification } from "../sockets/io";

export const notificationService = {
  async create(userId: string, type: string, title: string, body?: string, metadata?: Record<string, unknown>) {
    const notification = await notificationRepository.create({ userId, type, title, body, metadata });
    emitNotification(userId, { id: notification.id, type, title, body, metadata });
    return notification;
  },

  async notifyShiftAssigned(userId: string, shiftId: string, assignmentId: string) {
    return this.create(
      userId,
      "SHIFT_ASSIGNED",
      "New shift assigned",
      "You have been assigned to a shift.",
      { shiftId, assignmentId }
    );
  },

  async notifyShiftChanged(userId: string, shiftId: string, message: string) {
    return this.create(userId, "SHIFT_CHANGED", "Shift updated", message, { shiftId });
  },

  async notifySchedulePublished(userIds: string[], locationId: string) {
    const data = userIds.map((userId) => ({
      userId,
      type: "SCHEDULE_PUBLISHED",
      title: "Schedule published",
      body: "A schedule has been published.",
      metadata: { locationId },
    }));
    return notificationRepository.createMany(data);
  },

  async notifySwapRequest(receiverId: string, swapId: string) {
    return this.create(receiverId, "SWAP_REQUEST", "Swap request", "Someone requested to swap a shift with you.", { swapId });
  },

  async notifySwapAccepted(requesterId: string, swapId: string) {
    return this.create(requesterId, "SWAP_ACCEPTED", "Swap accepted", "Your swap request was accepted.", { swapId });
  },

  async notifySwapRejected(requesterId: string, swapId: string) {
    return this.create(requesterId, "SWAP_REJECTED", "Swap rejected", "Your swap request was rejected.", { swapId });
  },

  async notifySwapApproved(requesterId: string, receiverId: string, swapId: string) {
    await Promise.all([
      this.create(requesterId, "SWAP_APPROVED", "Swap approved", "Your swap has been approved by a manager.", { swapId }),
      this.create(receiverId, "SWAP_APPROVED", "Swap approved", "You have been assigned to the swapped shift.", { swapId }),
    ]);
  },

  async notifySwapCancelled(requesterId: string, receiverId: string, swapId: string, reason: string) {
    await Promise.all([
      this.create(requesterId, "SWAP_CANCELLED", "Swap cancelled", reason, { swapId }),
      this.create(receiverId, "SWAP_CANCELLED", "Swap cancelled", reason, { swapId }),
    ]);
  },

  async notifyDropCancelled(userId: string, dropRequestId: string, reason: string) {
    return this.create(userId, "DROP_CANCELLED", "Drop request cancelled", reason, { dropRequestId });
  },

  async notifyDropCreated(_shiftId: string, dropId: string) {
    // Notify managers / available staff - placeholder
    return Promise.resolve();
  },

  async notifyDropClaimed(originalUserId: string, dropRequestId: string) {
    return this.create(originalUserId, "DROP_CLAIMED", "Shift claimed", "Someone has claimed your dropped shift.", { dropRequestId });
  },

  async notifyDropApproved(originalUserId: string, _newUserId: string, dropRequestId: string) {
    return this.create(originalUserId, "DROP_APPROVED", "Drop approved", "Your shift drop has been approved.", { dropRequestId });
  },
};
