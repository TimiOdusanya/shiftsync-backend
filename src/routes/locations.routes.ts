import { Router } from "express";
import { locationController } from "../controllers/location.controller";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", locationController.list.bind(locationController));
router.get("/:id", locationController.getById.bind(locationController));

export const locationsRoutes = router;
