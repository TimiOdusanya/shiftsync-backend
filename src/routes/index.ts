import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { usersRoutes } from "./users.routes";
import { locationsRoutes } from "./locations.routes";
import { skillsRoutes } from "./skills.routes";
import { shiftsRoutes } from "./shifts.routes";
import { assignmentsRoutes } from "./assignments.routes";
import { swapsRoutes } from "./swaps.routes";
import { dropsRoutes } from "./drops.routes";
import { notificationsRoutes } from "./notifications.routes";
import { analyticsRoutes } from "./analytics.routes";
import { auditRoutes } from "./audit.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/locations", locationsRoutes);
router.use("/skills", skillsRoutes);
router.use("/shifts", shiftsRoutes);
router.use("/assignments", assignmentsRoutes);
router.use("/swaps", swapsRoutes);
router.use("/drops", dropsRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/audit", auditRoutes);

router.get("/health", (_req, res) => res.json({ status: "ok" }));

export const routes = router;
