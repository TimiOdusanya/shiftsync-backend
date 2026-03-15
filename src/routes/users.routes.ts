import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import { createUserSchema, updateUserSchema, userIdParamSchema, paginationQuerySchema } from "../validators/user";
import type { ZodSchema } from "zod";
import { bulkRecurringSchema, exceptionAvailabilitySchema, desiredHoursSchema } from "../validators/availability";
import { Role } from "@prisma/client";

const router = Router();

router.use(authMiddleware);

router.get("/", validateQuery(paginationQuerySchema as unknown as ZodSchema<{ page: number; limit: number }>), userController.list.bind(userController));
router.get("/:id", validateParams(userIdParamSchema), userController.getById.bind(userController));
router.post("/", requireRole(Role.ADMIN), validateBody(createUserSchema), userController.create.bind(userController));
router.patch("/:id", validateParams(userIdParamSchema), validateBody(updateUserSchema), userController.update.bind(userController));

router.get("/:id/availability", validateParams(userIdParamSchema), userController.getAvailability.bind(userController));
router.put("/:id/availability/recurring", validateParams(userIdParamSchema), validateBody(bulkRecurringSchema), userController.setRecurringAvailability.bind(userController));
router.put("/:id/availability/exception", validateParams(userIdParamSchema), validateBody(exceptionAvailabilitySchema), userController.setException.bind(userController));
router.get("/:id/desired-hours", validateParams(userIdParamSchema), userController.getDesiredHours.bind(userController));
router.put("/:id/desired-hours", validateParams(userIdParamSchema), validateBody(desiredHoursSchema), userController.setDesiredHours.bind(userController));

export const usersRoutes = router;
