import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { skillController } from "../controllers/skill.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", skillController.list.bind(skillController));

export const skillsRoutes = router;
