import { Request, Response } from "express";
import { overtimeService } from "../services/overtime.service";

export const overtimeController = {
  async getWarnings(req: Request, res: Response): Promise<void> {
    const userId = req.query.userId as string ?? req.userId!;
    const weekStart = req.query.weekStart ? new Date(req.query.weekStart as string) : new Date();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const warnings = await overtimeService.getWarningsForUser(userId, weekStart, weekEnd);
    res.json(warnings);
  },

  async getProjectedHours(req: Request, res: Response): Promise<void> {
    const userId = req.query.userId as string ?? req.userId!;
    const weekStart = req.query.weekStart ? new Date(req.query.weekStart as string) : new Date();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const hours = await overtimeService.getProjectedWeeklyHours(userId, weekStart, weekEnd);
    res.json({ projectedHours: hours });
  },
};
