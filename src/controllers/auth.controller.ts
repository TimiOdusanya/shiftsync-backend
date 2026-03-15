import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import type { LoginInput } from "../validators/user";

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const body = req.body as LoginInput;
    const result = await authService.login(body);
    if (!result) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    res.json(result);
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const token = req.body.refreshToken as string | undefined;
    if (!token) {
      res.status(400).json({ error: "Refresh token required" });
      return;
    }
    const result = await authService.refresh(token);
    if (!result) {
      res.status(401).json({ error: "Invalid or expired refresh token" });
      return;
    }
    res.json(result);
  },

  async me(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const user = await authService.me(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const { passwordHash: _, ...rest } = user;
    res.json(rest);
  },
};
