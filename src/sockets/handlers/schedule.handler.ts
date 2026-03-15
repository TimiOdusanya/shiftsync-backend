import { AuthenticatedSocket } from "../middleware.auth";
import { locationRoom, SOCKET_EVENTS } from "../rooms";

export function registerScheduleHandlers(socket: AuthenticatedSocket): void {
  socket.on("schedule:subscribe", (locationId: string) => {
    if (locationId) socket.join(locationRoom(locationId));
  });

  socket.on("schedule:unsubscribe", (locationId: string) => {
    if (locationId) socket.leave(locationRoom(locationId));
  });
}

export function broadcastScheduleUpdate(io: { to: (room: string) => { emit: (event: string, payload: unknown) => void } }, locationId: string, payload: unknown): void {
  io.to(locationRoom(locationId)).emit(SOCKET_EVENTS.SCHEDULE_UPDATED, payload);
}

export function broadcastShiftAssigned(io: { to: (room: string) => { emit: (event: string, payload: unknown) => void } }, userId: string, payload: unknown): void {
  io.to(`user:${userId}`).emit(SOCKET_EVENTS.SHIFT_ASSIGNED, payload);
}
