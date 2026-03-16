import { Request, Response } from "express";
import { Role } from "@prisma/client";
import { overtimeService } from "../services/overtime.service";
import { fairnessService } from "../services/fairness.service";
import { assignmentService } from "../services/assignment.service";
import { userRepository } from "../repositories/user.repository";
import { locationRepository } from "../repositories/location.repository";

export const analyticsController = {
  async getOvertimeProjection(req: Request, res: Response): Promise<void> {
    const userId = req.query.userId as string;
    const weekStart = req.query.weekStart ? new Date(req.query.weekStart as string) : new Date();
    const weekEnd = req.query.weekEnd ? new Date(req.query.weekEnd as string) : new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    if (!userId) {
      res.status(400).json({ error: "userId required" });
      return;
    }
    const [projectedHours, warnings] = await Promise.all([
      overtimeService.getProjectedWeeklyHours(userId, weekStart, weekEnd),
      overtimeService.getWarningsForUser(userId, weekStart, weekEnd),
    ]);
    res.json({ projectedHours, warnings });
  },

  async getWhatIf(req: Request, res: Response): Promise<void> {
    const shiftId = req.query.shiftId as string;
    const userId = req.query.userId as string;
    if (!shiftId || !userId) {
      res.status(400).json({ error: "shiftId and userId required" });
      return;
    }
    const weekStart = req.query.weekStart ? new Date(req.query.weekStart as string) : new Date();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const result = await overtimeService.whatIfAssign(shiftId, userId, weekStart, weekEnd);
    res.json(result);
  },

  async getFairness(req: Request, res: Response): Promise<void> {
    const locationId = req.query.locationId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);
    if (!locationId) {
      res.status(400).json({ error: "locationId required" });
      return;
    }
    const [distribution, score] = await Promise.all([
      fairnessService.getDistribution(locationId, startDate, endDate),
      fairnessService.getFairnessScore(locationId, startDate, endDate),
    ]);
    res.json({ distribution, fairnessScore: score });
  },

  async getOnDuty(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    const userRole = req.userRole;
    if (!userId || !userRole) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const locationId = req.query.locationId as string | undefined;
    let allowedLocationIds: string[] | null = null;

    if (userRole === Role.ADMIN) {
      allowedLocationIds = null; // all locations
    } else if (userRole === Role.MANAGER) {
      allowedLocationIds = await userRepository.getManagerLocationIds(userId);
      if (locationId && !allowedLocationIds.includes(locationId)) {
        res.status(403).json({ error: "You do not manage this location" });
        return;
      }
    } else if (userRole === Role.STAFF) {
      allowedLocationIds = await userRepository.getStaffLocationIds(userId);
      if (locationId && !allowedLocationIds.includes(locationId)) {
        res.status(403).json({ error: "You are not certified for this location" });
        return;
      }
    }

    if (Array.isArray(allowedLocationIds) && allowedLocationIds.length === 0) {
      res.json({});
      return;
    }

    const assignments = await assignmentService.getActiveNow(locationId, allowedLocationIds);
    const byLocation: Record<string, unknown[]> = {};
    for (const a of assignments) {
      const locId = a.shift.locationId;
      if (!byLocation[locId]) byLocation[locId] = [];
      byLocation[locId].push({
        userId: a.userId,
        shiftId: a.shiftId,
        startAt: a.shift.startAt,
        endAt: a.shift.endAt,
        user: a.user,
      });
    }
    res.json(byLocation);
  },

  /** Returns location IDs the current user is allowed to see on the on-duty view (for dropdown filtering). */
  async getAllowedOnDutyLocationIds(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    const userRole = req.userRole;
    if (!userId || !userRole) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (userRole === Role.ADMIN) {
      const locations = await locationRepository.findMany();
      res.json({ locationIds: locations.map((l) => l.id) });
      return;
    }
    if (userRole === Role.MANAGER) {
      const locationIds = await userRepository.getManagerLocationIds(userId);
      res.json({ locationIds });
      return;
    }
    if (userRole === Role.STAFF) {
      const locationIds = await userRepository.getStaffLocationIds(userId);
      res.json({ locationIds });
      return;
    }
    res.json({ locationIds: [] });
  },
};
