import { Router } from "express";
import { shiftController } from "../controllers/shift.controller";
import { authMiddleware } from "../middleware/auth";
import { requireManager } from "../middleware/rbac";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import { createShiftSchema, updateShiftSchema, shiftIdParamSchema, shiftFiltersQuerySchema } from "../validators/shift";

const router = Router();

router.use(authMiddleware);

router.get("/", validateQuery(shiftFiltersQuerySchema), shiftController.list.bind(shiftController));
router.get("/:id", validateParams(shiftIdParamSchema), shiftController.getById.bind(shiftController));
router.post("/", requireManager, validateBody(createShiftSchema), shiftController.create.bind(shiftController));
router.patch("/:id", requireManager, validateParams(shiftIdParamSchema), validateBody(updateShiftSchema), shiftController.update.bind(shiftController));
router.post("/:id/publish", requireManager, validateParams(shiftIdParamSchema), shiftController.publish.bind(shiftController));
router.post("/:id/unpublish", requireManager, validateParams(shiftIdParamSchema), shiftController.unpublish.bind(shiftController));
router.delete("/:id", requireManager, validateParams(shiftIdParamSchema), shiftController.delete.bind(shiftController));

export const shiftsRoutes = router;
