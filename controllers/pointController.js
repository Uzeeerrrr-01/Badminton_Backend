import TournamentPoint from "../models/TournamentPoint.js";
import PointHistory from "../models/PointHistory.js";
import { recalculateRanks } from "./matchController.js";
import { realtime } from "../services/realtimeService.js";

export async function getPoints(req, res) {
  try {
    const { category, entityType } = req.query;
    const filter = {};

    if (category && category !== "All") filter.category = category;
    if (entityType && entityType !== "both") filter.entity_type = entityType;

    const leaderboard = await TournamentPoint.find(filter).sort({
      rank: 1,
      total_tournament_points: -1,
      matches_won: -1,
    });

    const history = await PointHistory.find().sort({ created_at: -1 }).limit(100);

    const categories = [
      "Men's Singles",
      "Women's Singles",
      "Men's Doubles",
      "Women's Doubles",
      "Mixed Doubles",
    ];

    // Compute top leaders for each category
    const categoryLeaders = {};
    for (const cat of categories) {
      const topRecord = await TournamentPoint.findOne({ category: cat }).sort({
        rank: 1,
        total_tournament_points: -1,
        matches_won: -1,
      });
      const count = await TournamentPoint.countDocuments({ category: cat });
      categoryLeaders[cat] = {
        leader: topRecord || null,
        totalParticipants: count,
      };
    }

    return res.json({
      leaderboard,
      history,
      categoryLeaders,
      categories,
    });
  } catch (error) {
    console.error("GetPoints error:", error);
    return res.status(500).json({ error: "Failed to fetch leaderboard data." });
  }
}

export async function adjustPoints(req, res) {
  try {
    const { entityId, entityType, entityName, category, delta, reason, adjustedBy } = req.body;
    const numDelta = Number(delta);

    if (!numDelta || isNaN(numDelta)) {
      return res.status(400).json({ error: "Valid points delta required." });
    }
    if (!reason) {
      return res.status(400).json({ error: "Adjustment reason is required." });
    }

    let record = await TournamentPoint.findOne({ entity_id: entityId, category });
    if (record) {
      record.total_tournament_points += numDelta;
      record.updated_at = new Date();
      await record.save();
    } else {
      const id = `pts-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
      record = await TournamentPoint.create({
        id,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        category,
        total_tournament_points: numDelta,
        rank: 1,
      });
    }

    const logId = `log-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    await PointHistory.create({
      id: logId,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      category,
      points_delta: numDelta,
      reason,
      adjusted_by: adjustedBy || req.admin?.name || "Admin",
    });

    await recalculateRanks();
    realtime.broadcastPointsUpdate();

    return res.json({ success: true, message: "Points adjusted successfully." });
  } catch (error) {
    console.error("AdjustPoints error:", error);
    return res.status(400).json({ error: error.message || "Failed to adjust points." });
  }
}
