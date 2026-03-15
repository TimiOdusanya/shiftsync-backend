import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { authService } from "../services/auth.service";

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const payload = authService.verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.userId = payload.sub;
  req.userRole = payload.role;
  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
  next();
}

export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    next();
    return;
  }

  const payload = authService.verifyAccessToken(token);
  if (payload) {
    req.userId = payload.sub;
    req.userRole = payload.role;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
  next();
}
