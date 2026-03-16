import { Router } from "express";
import { dropController } from "../controllers/drop.controller";
import { authMiddleware } from "../middleware/auth";
import { requireManager, requireStaffOnly } from "../middleware/rbac";
import { validateBody, validateParams } from "../middleware/validate";
import { z } from "zod";

const createDropSchema = z.object({ shiftId: z.string().min(1) });
const dropIdParamSchema = z.object({ id: z.string().cuid() });

const router = Router();

router.use(authMiddleware);

router.get("/open", dropController.listOpen.bind(dropController));
router.get("/my", dropController.getMyDrops.bind(dropController));
router.get("/pending-approval", requireManager, dropController.listPendingApproval.bind(dropController));
router.post("/", validateBody(createDropSchema), dropController.create.bind(dropController));
router.post("/claim", requireStaffOnly, validateBody(z.object({ dropRequestId: z.string().cuid() })), dropController.claim.bind(dropController));
router.post("/:id/cancel", validateParams(dropIdParamSchema), dropController.cancelByOwner.bind(dropController));
router.post("/:id/approve", requireManager, validateParams(dropIdParamSchema), dropController.approveByManager.bind(dropController));
router.post("/:id/reject", requireManager, validateParams(dropIdParamSchema), dropController.rejectByManager.bind(dropController));

export const dropsRoutes = router;
