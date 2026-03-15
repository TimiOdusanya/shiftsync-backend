import { Request, Response } from "express";
import { skillRepository } from "../repositories/skill.repository";

export const skillController = {
  async list(_req: Request, res: Response): Promise<void> {
    const skills = await skillRepository.findMany();
    res.json(skills);
  },
};
