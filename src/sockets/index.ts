import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { setSocketIo } from "./io";
import { socketAuthMiddleware } from "./middleware.auth";
import { registerScheduleHandlers } from "./handlers/schedule.handler";
import { registerSwapHandlers } from "./handlers/swap.handler";
import { registerPresenceHandlers } from "./handlers/presence.handler";
import { userRoom, SOCKET_EVENTS } from "./rooms";
import type { AuthenticatedSocket } from "./middleware.auth";

export function initSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN ?? "*" },
    path: "/socket.io",
  });

  setSocketIo(io);

  io.use((socket, next) => {
    socketAuthMiddleware(socket as AuthenticatedSocket, next);
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    if (socket.userId) {
      socket.join(userRoom(socket.userId));
    }
    registerScheduleHandlers(socket);
    registerSwapHandlers(socket);
    registerPresenceHandlers(socket);

    socket.on("disconnect", () => {});
  });

  return io;
}

export { SOCKET_EVENTS } from "./rooms";
export type { AuthenticatedSocket } from "./middleware.auth";
