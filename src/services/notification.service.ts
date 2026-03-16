import { notificationRepository } from "../repositories/notification.repository";
import { userRepository } from "../repositories/user.repository";
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

  async notifySwapRequest(
    receiverId: string,
    swapId: string,
    requesterFirstName?: string,
    requesterLastName?: string
  ) {
    const body =
      requesterFirstName != null && requesterLastName != null
        ? `${requesterFirstName} ${requesterLastName} requested to swap a shift with you.`
        : "Someone requested to swap a shift with you.";
    return this.create(receiverId, "SWAP_REQUEST", "Swap request", body, { swapId });
  },

  async notifySwapAccepted(requesterId: string, swapId: string) {
    return this.create(requesterId, "SWAP_ACCEPTED", "Swap accepted", "Your swap request was accepted.", { swapId });
  },

  async notifyManagersSwapPendingApproval(
    managerIds: string[],
    swapId: string,
    requesterFirstName: string,
    requesterLastName: string,
    receiverFirstName: string,
    receiverLastName: string
  ) {
    const body = `${requesterFirstName} ${requesterLastName} and ${receiverFirstName} ${receiverLastName} have agreed to swap a shift. Approval needed.`;
    await Promise.all(
      managerIds.map((userId) =>
        this.create(userId, "SWAP_PENDING_APPROVAL", "Swap pending approval", body, { swapId })
      )
    );
  },

  async notifySwapRejected(requesterId: string, swapId: string) {
    return this.create(requesterId, "SWAP_REJECTED", "Swap rejected", "Your swap request was rejected.", { swapId });
  },

  async notifySwapRejectedByManager(requesterId: string, receiverId: string, swapId: string) {
    await Promise.all([
      this.create(requesterId, "SWAP_REJECTED", "Swap rejected", "Your swap request was rejected by a manager.", { swapId }),
      this.create(receiverId, "SWAP_REJECTED", "Swap rejected", "The swap request was rejected by a manager.", { swapId }),
    ]);
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

  async notifyDropCreated(shiftId: string, dropId: string, locationId: string) {
    const managerIds = await userRepository.getAdminAndManagerIdsForLocation(locationId);
    const body = "A staff member has dropped a shift. It is now open for others to claim.";
    await Promise.all(
      managerIds.map((userId: string) =>
        this.create(userId, "DROP_CREATED", "Shift dropped", body, { shiftId, dropRequestId: dropId })
      )
    );
  },

  async notifyDropClaimed(
    originalUserId: string,
    dropRequestId: string,
    claimerFirstName?: string,
    claimerLastName?: string
  ) {
    const body =
      claimerFirstName != null && claimerLastName != null
        ? `${claimerFirstName} ${claimerLastName} has claimed your dropped shift.`
        : "Someone has claimed your dropped shift.";
    await this.create(originalUserId, "DROP_CLAIMED", "Shift claimed", body, { dropRequestId });
  },

  async notifyManagersDropClaimed(
    managerIds: string[],
    dropRequestId: string,
    claimerFirstName?: string,
    claimerLastName?: string
  ) {
    const who =
      claimerFirstName != null && claimerLastName != null
        ? `${claimerFirstName} ${claimerLastName}`
        : "A staff member";
    const body = `${who} has claimed a dropped shift. Pending your approval.`;
    await Promise.all(
      managerIds.map((userId) =>
        this.create(userId, "DROP_PENDING_APPROVAL", "Drop pending approval", body, { dropRequestId })
      )
    );
  },

  async notifyDropApproved(originalUserId: string, _newUserId: string, dropRequestId: string) {
    return this.create(originalUserId, "DROP_APPROVED", "Drop approved", "Your shift drop has been approved.", { dropRequestId });
  },
};
