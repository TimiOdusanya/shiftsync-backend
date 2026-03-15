export const userRoom = (userId: string) => `user:${userId}`;
export const locationRoom = (locationId: string) => `location:${locationId}`;
export const managerRoom = (managerId: string) => `manager:${managerId}`;

export const SOCKET_EVENTS = {
  SCHEDULE_UPDATED: "schedule:updated",
  SHIFT_ASSIGNED: "shift:assigned",
  SWAP_STATE_CHANGE: "swap:stateChange",
  DROP_CLAIMED: "drop:claimed",
  CONFLICT_ASSIGNMENT: "conflict:assignment",
  ON_DUTY_UPDATE: "on-duty:update",
  NOTIFICATION: "notification",
} as const;
