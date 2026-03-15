import { AuthenticatedSocket } from "../middleware.auth";
import { userRoom, SOCKET_EVENTS } from "../rooms";

export function registerSwapHandlers(socket: AuthenticatedSocket): void {
  socket.on("swap:subscribe", () => {
    if (socket.userId) socket.join(userRoom(socket.userId));
  });
}

export function broadcastSwapStateChange(
  io: { to: (room: string) => { emit: (event: string, payload: unknown) => void } },
  userIds: string[],
  payload: unknown
): void {
  userIds.forEach((id) => io.to(userRoom(id)).emit(SOCKET_EVENTS.SWAP_STATE_CHANGE, payload));
}

export function broadcastDropClaimed(
  io: { to: (room: string) => { emit: (event: string, payload: unknown) => void } },
  userId: string,
  payload: unknown
): void {
  io.to(userRoom(userId)).emit(SOCKET_EVENTS.DROP_CLAIMED, payload);
}

export function broadcastConflict(
  io: { to: (room: string) => { emit: (event: string, payload: unknown) => void } },
  userId: string,
  payload: unknown
): void {
  io.to(userRoom(userId)).emit(SOCKET_EVENTS.CONFLICT_ASSIGNMENT, payload);
}
