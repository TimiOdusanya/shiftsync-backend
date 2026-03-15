import { Router } from "express";
import { swapController } from "../controllers/swap.controller";
import { authMiddleware } from "../middleware/auth";
import { requireManager } from "../middleware/rbac";
import { validateBody, validateParams } from "../middleware/validate";
import { createSwapSchema, swapIdParamSchema } from "../validators/swap";

const router = Router();

router.use(authMiddleware);

router.get("/my", swapController.getMyRequests.bind(swapController));
router.post("/", validateBody(createSwapSchema), swapController.create.bind(swapController));
router.post("/:id/accept", validateParams(swapIdParamSchema), swapController.accept.bind(swapController));
router.post("/:id/reject", validateParams(swapIdParamSchema), swapController.reject.bind(swapController));
router.post("/:id/approve", requireManager, validateParams(swapIdParamSchema), swapController.approveByManager.bind(swapController));
router.post("/:id/reject-manager", requireManager, validateParams(swapIdParamSchema), swapController.rejectByManager.bind(swapController));
router.post("/:id/cancel", validateParams(swapIdParamSchema), swapController.cancel.bind(swapController));

export const swapsRoutes = router;
