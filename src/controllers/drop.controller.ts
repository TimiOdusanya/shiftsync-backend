import { Request, Response } from "express";
import { dropService } from "../services/drop.service";

export const dropController = {
  async create(req: Request, res: Response): Promise<void> {
    const shiftId = req.body.shiftId as string;
    const result = await dropService.create(shiftId, req.userId!);
    if (!result.success && "error" in result) {
      res.status(400).json(result);
      return;
    }
    res.status(201).json(result);
  },

  async claim(req: Request, res: Response): Promise<void> {
    const dropRequestId = req.body.dropRequestId as string;
    const result = await dropService.claim(dropRequestId, req.userId!);
    if (!result) {
      res.status(404).json({ error: "Drop request not found or expired" });
      return;
    }
    if (!result.success && "error" in result) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  },

  async approveByManager(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const result = await dropService.approveByManager(id, req.userId!);
    if (!result) {
      res.status(404).json({ error: "Drop request not found or not pending approval" });
      return;
    }
    res.json(result);
  },

  async rejectByManager(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const result = await dropService.rejectByManager(id, req.userId!);
    if (!result) {
      res.status(404).json({ error: "Drop request not found" });
      return;
    }
    res.json(result);
  },

  async cancelByOwner(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const result = await dropService.cancelByOwner(id, req.userId!);
    if (!result) {
      res.status(404).json({ error: "Drop request not found" });
      return;
    }
    if (!result.success && "error" in result) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  },

  async listOpen(req: Request, res: Response): Promise<void> {
    const locationId = req.query.locationId as string | undefined;
    const drops = await dropService.listOpen(locationId);
    res.json(drops);
  },

  async listPendingApproval(req: Request, res: Response): Promise<void> {
    const locationId = req.query.locationId as string | undefined;
    const drops = await dropService.listPendingApproval(
      req.userRole!,
      req.userId!,
      locationId
    );
    res.json(drops);
  },

  async getMyDrops(req: Request, res: Response): Promise<void> {
    const drops = await dropService.getMyDrops(req.userId!);
    res.json(drops);
  },
};
