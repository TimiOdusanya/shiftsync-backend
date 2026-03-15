import { Request, Response } from "express";
import { auditService } from "../services/audit.service";
export const auditController = {
  async getByShiftId(req: Request, res: Response): Promise<void> {
    const shiftId = req.params.shiftId as string;
    const logs = await auditService.getByShiftId(shiftId);
    res.json(logs);
  },

  async getByFilters(req: Request, res: Response): Promise<void> {
    const query = req.query as Record<string, string | undefined>;
    const startDate = query.startDate ? new Date(query.startDate) : new Date(0);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const logs = await auditService.getByFilters({
      entityType: query.entityType,
      entityId: query.entityId,
      userId: query.userId,
      startDate,
      endDate,
      limit: 100,
      offset: 0,
    });
    res.json(logs);
  },

  async export(req: Request, res: Response): Promise<void> {
    const query = req.query as Record<string, string | undefined>;
    const startDate = new Date(query.startDate ?? 0);
    const endDate = new Date(query.endDate ?? Date.now());
    const logs = await auditService.export(startDate, endDate, query.locationId);
    res.setHeader("Content-Type", "application/json");
    res.json(logs);
  },
};
