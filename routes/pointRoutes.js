import { Router } from "express";
import { getPoints, adjustPoints } from "../controllers/pointController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", getPoints);
router.post("/", requireAdmin, adjustPoints);

export default router;
