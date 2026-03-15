import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { authMiddleware } from "../middleware/auth";
import { validateParams } from "../middleware/validate";
import { z } from "zod";

const notificationIdParamSchema = z.object({ id: z.string().cuid() });

const router = Router();

router.use(authMiddleware);

router.get("/", notificationController.list.bind(notificationController));
router.get("/unread-count", notificationController.getUnreadCount.bind(notificationController));
router.patch("/:id/read", validateParams(notificationIdParamSchema), notificationController.markRead.bind(notificationController));
router.patch("/read-all", notificationController.markAllRead.bind(notificationController));

export const notificationsRoutes = router;
