import { Request, Response } from "express";
import { notificationRepository } from "../repositories/notification.repository";

export const notificationController = {
  async list(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const unreadOnly = req.query.unreadOnly === "true";
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const notifications = await notificationRepository.findManyByUserId(userId, {
      unreadOnly,
      limit,
      offset,
    });
    res.json(notifications);
  },

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const count = await notificationRepository.countUnreadByUserId(userId);
    res.json({ count });
  },

  async markRead(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const userId = req.userId!;
    await notificationRepository.markRead(id, userId);
    res.json({ ok: true });
  },

  async markAllRead(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    await notificationRepository.markAllReadByUserId(userId);
    res.json({ ok: true });
  },
};
