import { Request, Response } from "express";
import { swapService } from "../services/swap.service";
import type { CreateSwapBody } from "../types/api";

export const swapController = {
  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateSwapBody;
    const result = await swapService.create(req.userId!, body);
    if (!result.success && "error" in result) {
      res.status(400).json(result);
      return;
    }
    res.status(201).json(result);
  },

  async accept(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const result = await swapService.accept(id, req.userId!);
    if (!result) {
      res.status(404).json({ error: "Swap request not found or already resolved" });
      return;
    }
    res.json(result);
  },

  async reject(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const reason = req.body.reason as string | undefined;
    const result = await swapService.reject(id, req.userId!, reason);
    if (!result) {
      res.status(404).json({ error: "Swap request not found or already resolved" });
      return;
    }
    res.json(result);
  },

  async approveByManager(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const result = await swapService.approveByManager(id, req.userId!);
    if (!result) {
      res.status(404).json({ error: "Swap request not found or not pending approval" });
      return;
    }
    res.json(result);
  },

  async rejectByManager(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const reason = req.body.reason as string | undefined;
    const result = await swapService.rejectByManager(id, req.userId!, reason);
    if (!result) {
      res.status(404).json({ error: "Swap request not found or not pending approval" });
      return;
    }
    res.json(result);
  },

  async cancel(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const result = await swapService.cancelByRequester(id, req.userId!);
    if (!result) {
      res.status(404).json({ error: "Swap request not found or cannot be cancelled" });
      return;
    }
    res.json(result);
  },

  async getMyRequests(req: Request, res: Response): Promise<void> {
    const result = await swapService.getMyRequests(req.userId!);
    res.json(result);
  },
};
