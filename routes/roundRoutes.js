import { Router } from "express";
import {
  previewRound,
  createRound,
  publishRound,
  resetRound,
  getCategoryOverview,
  getCategoryBracket,
  getStandings,
  getRounds,
  getRound,
  checkAndUpdateRoundStatus,
} from "../controllers/roundController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// Public read-only endpoints
router.get("/", getRounds);
router.get("/category/:category/overview", getCategoryOverview);
router.get("/category/:category/bracket", getCategoryBracket);
router.get("/category/:category/standings", getStandings);
router.get("/:id", getRound);

// Protected Admin-only endpoints (Strictly enforced backend authentication)
router.post("/preview", requireAdmin, previewRound);
router.post("/create", requireAdmin, createRound);
router.post("/:id/publish", requireAdmin, publishRound);
router.post("/:id/reset", requireAdmin, resetRound);
router.post("/:id/check-status", requireAdmin, async (req, res) => {
  try {
    const updated = await checkAndUpdateRoundStatus(req.params.id);
    return res.json({ success: true, round: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
