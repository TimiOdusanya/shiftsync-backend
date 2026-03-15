import { Router } from "express";
import { assignmentController } from "../controllers/assignment.controller";
import { authMiddleware } from "../middleware/auth";
import { requireManager } from "../middleware/rbac";
import { validateBody, validateParams } from "../middleware/validate";
import { assignStaffSchema, shiftIdParamSchema } from "../validators/assignment";

const router = Router();

router.use(authMiddleware);

router.get("/shifts/:shiftId/assignments", validateParams(shiftIdParamSchema), assignmentController.getByShiftId.bind(assignmentController));
router.get("/shifts/:shiftId/assignments/alternatives", validateParams(shiftIdParamSchema), assignmentController.getAlternatives.bind(assignmentController));
router.post("/shifts/:shiftId/assignments", requireManager, validateParams(shiftIdParamSchema), validateBody(assignStaffSchema), assignmentController.assign.bind(assignmentController));
router.delete("/shifts/:shiftId/assignments/:userId", requireManager, validateParams(shiftIdParamSchema), assignmentController.unassign.bind(assignmentController));

router.get("/users/:userId/assignments", assignmentController.getByUserId.bind(assignmentController));

export const assignmentsRoutes = router;
