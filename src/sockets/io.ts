import { Server } from "socket.io";
import { userRoom, locationRoom, SOCKET_EVENTS } from "./rooms";

let io: Server | null = null;

export function setSocketIo(server: Server | null) {
  io = server;
}

export function getSocketIo(): Server | null {
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(userRoom(userId)).emit(event, payload);
}

export function emitToLocation(locationId: string, event: string, payload: unknown) {
  io?.to(locationRoom(locationId)).emit(event, payload);
}

export function emitScheduleUpdated(locationId: string, payload: unknown) {
  emitToLocation(locationId, SOCKET_EVENTS.SCHEDULE_UPDATED, payload);
}

export function emitShiftAssigned(userId: string, payload: unknown) {
  emitToUser(userId, SOCKET_EVENTS.SHIFT_ASSIGNED, payload);
}

export function emitSwapStateChange(userIds: string[], payload: unknown) {
  userIds.forEach((id) => emitToUser(id, SOCKET_EVENTS.SWAP_STATE_CHANGE, payload));
}

export function emitDropClaimed(userId: string, payload: unknown) {
  emitToUser(userId, SOCKET_EVENTS.DROP_CLAIMED, payload);
}

export function emitConflict(userId: string, payload: unknown) {
  emitToUser(userId, SOCKET_EVENTS.CONFLICT_ASSIGNMENT, payload);
}

export function emitOnDutyUpdate(locationId: string, payload: unknown) {
  emitToLocation(locationId, SOCKET_EVENTS.ON_DUTY_UPDATE, payload);
}

export function emitNotification(userId: string, payload: unknown) {
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATION, payload);
}
