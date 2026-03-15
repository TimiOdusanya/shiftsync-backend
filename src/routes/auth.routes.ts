import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { loginSchema } from "../validators/user";

const router = Router();

router.post("/login", validateBody(loginSchema), authController.login.bind(authController));
router.post("/refresh", authController.refresh.bind(authController));
router.get("/me", authMiddleware, authController.me.bind(authController));

export const authRoutes = router;
