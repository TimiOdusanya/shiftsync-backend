import { Socket } from "socket.io";
import { authService } from "../services/auth.service";
import type { JwtPayload } from "../middleware/auth";

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export async function socketAuthMiddleware(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): Promise<void> {
  const token = socket.handshake.auth?.token ?? socket.handshake.headers?.authorization?.replace("Bearer ", "");

  if (!token) {
    next(new Error("Authentication required"));
    return;
  }

  try {
    const payload = authService.verifyAccessToken(token);
    if (!payload) {
      next(new Error("Invalid token"));
      return;
    }
    socket.userId = payload.sub;
    socket.userRole = payload.role;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
}
