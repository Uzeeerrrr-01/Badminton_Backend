import { Router } from "express";
import {
  getPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deletePlayer,
} from "../controllers/playerController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", getPlayers);
router.get("/:id", getPlayer);
router.post("/", requireAdmin, createPlayer);
router.put("/:id", requireAdmin, updatePlayer);
router.delete("/:id", requireAdmin, deletePlayer);

export default router;
