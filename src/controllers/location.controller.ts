import { Request, Response } from "express";
import { locationRepository } from "../repositories/location.repository";
import { Role } from "@prisma/client";

export const locationController = {
  async getById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const location = await locationRepository.findById(id);
    if (!location) {
      res.status(404).json({ error: "Location not found" });
      return;
    }
    res.json(location);
  },

  async list(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const role = req.userRole!;
    const locations =
      role === Role.ADMIN
        ? await locationRepository.findMany()
        : role === Role.MANAGER
          ? await locationRepository.findManyForManager(userId)
          : await locationRepository.findManyForStaff(userId);
    res.json(locations);
  },
};
