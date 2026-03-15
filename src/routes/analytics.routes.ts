import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { overtimeController } from "../controllers/overtime.controller";
import { authMiddleware } from "../middleware/auth";
import { requireManager } from "../middleware/rbac";

const router = Router();

router.use(authMiddleware);

router.get("/overtime/projection", analyticsController.getOvertimeProjection.bind(analyticsController));
router.get("/overtime/what-if", analyticsController.getWhatIf.bind(analyticsController));
router.get("/fairness", analyticsController.getFairness.bind(analyticsController));
router.get("/on-duty", analyticsController.getOnDuty.bind(analyticsController));

router.get("/overtime/warnings", overtimeController.getWarnings.bind(overtimeController));
router.get("/overtime/projected-hours", overtimeController.getProjectedHours.bind(overtimeController));

export const analyticsRoutes = router;
