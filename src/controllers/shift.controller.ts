import { Request, Response } from "express";
import { shiftService } from "../services/shift.service";
import type { CreateShiftInput, UpdateShiftInput } from "../validators/shift";
import type { ShiftFilters } from "../repositories/shift.repository";

export const shiftController = {
  async getById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const shift = await shiftService.getById(id, req.userRole, req.userId);
    if (!shift) {
      res.status(404).json({ error: "Shift not found" });
      return;
    }
    res.json(shift);
  },

  async list(req: Request, res: Response): Promise<void> {
    const filters: ShiftFilters = {
      locationId: req.query.locationId as string | undefined,
      state: req.query.state as "DRAFT" | "PUBLISHED" | undefined,
    };
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
    const shifts = await shiftService.list(filters, req.userId!, req.userRole!);
    res.json(shifts);
  },

  async create(req: Request, res: Response): Promise<void> {
    const data = req.body as CreateShiftInput;
    const shift = await shiftService.create(data, req.userId!);
    res.status(201).json(shift);
  },

  async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const data = req.body as UpdateShiftInput;
    const shift = await shiftService.update(id, data, req.userId!);
    if (!shift) {
      res.status(404).json({ error: "Shift not found" });
      return;
    }
    res.json(shift);
  },

  async publish(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const shift = await shiftService.publish(id, req.userId!);
    if (!shift) {
      res.status(404).json({ error: "Shift not found" });
      return;
    }
    res.json(shift);
  },

  async unpublish(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    try {
      const shift = await shiftService.unpublish(id, req.userId!);
      if (!shift) {
        res.status(404).json({ error: "Shift not found" });
        return;
      }
      res.json(shift);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },

  async delete(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const result = await shiftService.delete(id, req.userId!);
    if (!result) {
      res.status(404).json({ error: "Shift not found" });
      return;
    }
    res.json(result);
  },
};
