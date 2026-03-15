import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { userRepository } from "../repositories/user.repository";

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userId || !req.userRole) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.userRole)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  return requireRole(Role.ADMIN)(req, res, next);
}

export function requireManager(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  return requireRole(Role.ADMIN, Role.MANAGER)(req, res, next);
}

export function requireStaff(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  return requireRole(Role.ADMIN, Role.MANAGER, Role.STAFF)(req, res, next);
}

export function canAccessLocation(locationIdParamKey: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const locationId = (req.params[locationIdParamKey] ?? req.query.locationId) as string | undefined;
    if (!locationId) {
      next();
      return;
    }

    if (req.userRole === Role.ADMIN) {
      next();
      return;
    }

    const userId = req.userId!;
    if (req.userRole === Role.MANAGER) {
      const ids = await userRepository.getManagerLocationIds(userId);
      if (ids.includes(locationId)) {
        next();
        return;
      }
      res.status(403).json({ error: "You do not manage this location" });
      return;
    }

    if (req.userRole === Role.STAFF) {
      const ids = await userRepository.getStaffLocationIds(userId);
      if (ids.includes(locationId)) {
        next();
        return;
      }
      res.status(403).json({ error: "You are not certified for this location" });
      return;
    }

    next();
  };
}
