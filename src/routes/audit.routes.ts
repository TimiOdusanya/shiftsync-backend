import { Router } from "express";
import { auditController } from "../controllers/audit.controller";
import { authMiddleware } from "../middleware/auth";
import { requireAdmin, requireManager } from "../middleware/rbac";
import { validateParams } from "../middleware/validate";
import { z } from "zod";

const shiftIdParamSchema = z.object({ shiftId: z.string().cuid() });

const router = Router();

router.use(authMiddleware);

router.get("/shifts/:shiftId", requireManager, validateParams(shiftIdParamSchema), auditController.getByShiftId.bind(auditController));
router.get("/", requireManager, auditController.getByFilters.bind(auditController));
router.get("/export", requireAdmin, auditController.export.bind(auditController));

export const auditRoutes = router;
