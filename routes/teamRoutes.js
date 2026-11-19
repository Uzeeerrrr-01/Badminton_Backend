import { Router } from "express";
import {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
} from "../controllers/teamController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", getTeams);
router.get("/:id", getTeam);
router.post("/", requireAdmin, createTeam);
router.put("/:id", requireAdmin, updateTeam);
router.delete("/:id", requireAdmin, deleteTeam);

export default router;
