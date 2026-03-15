import { Request, Response } from "express";
import { userService } from "../services/user.service";
import type { CreateUserInput, UpdateUserInput } from "../validators/user";
import type { RecurringAvailabilityInput, ExceptionAvailabilityInput, DesiredHoursInput } from "../validators/availability";

export const userController = {
  async getById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const user = await userService.getById(id, req.userRole!, req.userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const { passwordHash: _, ...rest } = user;
    res.json(rest);
  },

  async list(req: Request, res: Response): Promise<void> {
    const role = req.query.role as string | undefined;
    const locationId = req.query.locationId as string | undefined;
    const users = await userService.list(
      { role: role as "ADMIN" | "MANAGER" | "STAFF" | undefined, locationId },
      req.userId!,
      req.userRole!
    );
    res.json(users.map((u: { passwordHash?: string; [k: string]: unknown }) => ({ ...u, passwordHash: undefined })));
  },

  async create(req: Request, res: Response): Promise<void> {
    const data = req.body as CreateUserInput;
    const user = await userService.create(data);
    const { passwordHash: _, ...rest } = user;
    res.status(201).json(rest);
  },

  async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const data = req.body as UpdateUserInput;
    const user = await userService.update(id, data);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const { passwordHash: _, ...rest } = user;
    res.json(rest);
  },

  async getAvailability(req: Request, res: Response): Promise<void> {
    const userId = (req.params.id ?? req.userId) as string;
    const availability = await userService.getAvailability(userId);
    res.json(availability);
  },

  async setRecurringAvailability(req: Request, res: Response): Promise<void> {
    const userId = (req.params.id ?? req.userId) as string;
    const { windows } = req.body as { windows: RecurringAvailabilityInput[] };
    const result = await userService.setRecurringAvailability(userId, windows);
    res.json(result);
  },

  async setException(req: Request, res: Response): Promise<void> {
    const userId = (req.params.id ?? req.userId) as string;
    const data = req.body as ExceptionAvailabilityInput;
    const result = await userService.setException(userId, data);
    res.json(result);
  },

  async setDesiredHours(req: Request, res: Response): Promise<void> {
    const userId = (req.params.id ?? req.userId) as string;
    const data = req.body as DesiredHoursInput;
    const result = await userService.setDesiredHours(userId, data);
    res.json(result);
  },

  async getDesiredHours(req: Request, res: Response): Promise<void> {
    const userId = (req.params.id ?? req.userId) as string;
    const result = await userService.getDesiredHours(userId);
    res.json(result ?? {});
  },
};
