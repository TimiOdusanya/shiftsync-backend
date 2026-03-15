import { AuthenticatedSocket } from "../middleware.auth";
import { locationRoom, SOCKET_EVENTS } from "../rooms";

export function registerPresenceHandlers(socket: AuthenticatedSocket): void {
  socket.on("on-duty:subscribe", (locationId: string) => {
    if (locationId) socket.join(locationRoom(locationId));
  });

  socket.on("on-duty:unsubscribe", (locationId: string) => {
    if (locationId) socket.leave(locationRoom(locationId));
  });
}

export function broadcastOnDutyUpdate(
  io: { to: (room: string) => { emit: (event: string, payload: unknown) => void } },
  locationId: string,
  payload: unknown
): void {
  io.to(locationRoom(locationId)).emit(SOCKET_EVENTS.ON_DUTY_UPDATE, payload);
}
