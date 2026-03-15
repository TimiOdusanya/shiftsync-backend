import { Request, Response } from "express";
import { assignmentService } from "../services/assignment.service";
import { constraintService } from "../services/constraint.service";
import type { AssignStaffBody } from "../types/api";

export const assignmentController = {
  async getByShiftId(req: Request, res: Response): Promise<void> {
    const shiftId = req.params.shiftId as string;
    const assignments = await assignmentService.getByShiftId(shiftId);
    res.json(assignments);
  },

  async getByUserId(req: Request, res: Response): Promise<void> {
    const userId = req.params.userId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const assignments = await assignmentService.getByUserId(userId, startDate, endDate);
    res.json(assignments);
  },

  async assign(req: Request, res: Response): Promise<void> {
    const shiftId = req.params.shiftId as string;
    const body = req.body as AssignStaffBody;
    const result = await assignmentService.assign(shiftId, body, req.userId!);
    if (!result.success && result.violation) {
      res.status(400).json(result);
      return;
    }
    res.status(201).json(result);
  },

  async unassign(req: Request, res: Response): Promise<void> {
    const shiftId = req.params.shiftId as string;
    const userId = req.params.userId as string;
    const result = await assignmentService.unassign(shiftId, userId, req.userId!);
    if (!result) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }
    res.json(result);
  },

  async getAlternatives(req: Request, res: Response): Promise<void> {
    const shiftId = req.params.shiftId as string;
    const alternatives = await constraintService.getAlternatives(shiftId);
    res.json(alternatives);
  },
};
