import Team from "../models/Team.js";
import Player from "../models/Player.js";
import mongoose from "mongoose";
import { deleteTeamFromSqlite } from "../services/sqliteSync.js";

async function enrichTeam(team) {
  const p1 = await Player.findOne({ id: team.player1_id });
  const p2 = team.player2_id ? await Player.findOne({ id: team.player2_id }) : null;
  return {
    ...team.toObject(),
    player1: p1,
    player2: p2,
  };
}

export async function getTeams(req, res) {
  try {
    const { category, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const teams = await Team.find(filter).sort({ name: 1 });
    const enriched = await Promise.all(teams.map(enrichTeam));
    return res.json({ teams: enriched });
  } catch (error) {
    console.error("GetTeams error:", error);
    return res.status(500).json({ error: "Failed to fetch teams." });
  }
}

export async function getTeam(req, res) {
  try {
    const team = await Team.findOne({ id: req.params.id });
    if (!team) return res.status(404).json({ error: "Team not found." });
    const enriched = await enrichTeam(team);
    return res.json({ team: enriched });
  } catch (error) {
    console.error("GetTeam error:", error);
    return res.status(500).json({ error: "Failed to fetch team." });
  }
}

export async function createTeam(req, res) {
  try {
    let { name, category, player1_id, player2_id } = req.body;
    if (!category || !player1_id || !player2_id) {
      return res.status(400).json({ error: "Category and both players are required." });
    }

    if (player1_id === player2_id) {
      return res.status(400).json({ error: "Player 1 and Player 2 cannot be the same person." });
    }

    const p1 = await Player.findOne({ id: player1_id });
    const p2 = await Player.findOne({ id: player2_id });
    if (!p1 || !p2) {
      return res.status(400).json({ error: "Selected players could not be found." });
    }

    // In doubles and mixed doubles, team name defaults to "Team <Player 1> and <Player 2>"
    if (!name || !name.trim() || /^team\s+[a-z0-9]+$/i.test(name.trim()) || /^mixed\s+team\s+[a-z0-9]+$/i.test(name.trim())) {
      name = `Team ${p1.full_name} and ${p2.full_name}`;
    }

    const id = `tm-${Date.now().toString(36)}`;
    const team = await Team.create({
      id,
      name: name.trim(),
      category,
      player1_id,
      player2_id,
      status: "Active",
    });

    const enriched = await enrichTeam(team);
    return res.status(201).json({ success: true, team: enriched });
  } catch (error) {
    console.error("CreateTeam error:", error);
    return res.status(400).json({ error: error.message || "Failed to create team." });
  }
}

export async function updateTeam(req, res) {
  try {
    const team = await Team.findOne({ id: req.params.id });
    if (!team) return res.status(404).json({ error: "Team not found." });

    if (!req.body.name || !req.body.name.trim()) {
      const p1Id = req.body.player1_id || team.player1_id;
      const p2Id = req.body.player2_id || team.player2_id;
      const p1 = await Player.findOne({ id: p1Id });
      const p2 = await Player.findOne({ id: p2Id });
      if (p1 && p2) {
        req.body.name = `Team ${p1.full_name} and ${p2.full_name}`;
      }
    }

    Object.assign(team, req.body);
    team.updated_at = new Date();
    await team.save();

    const enriched = await enrichTeam(team);
    return res.json({ success: true, team: enriched });
  } catch (error) {
    console.error("UpdateTeam error:", error);
    return res.status(400).json({ error: error.message || "Failed to update team." });
  }
}

export async function deleteTeam(req, res) {
  try {
    const rawId = req.params.id;
    const isObjId = mongoose.isValidObjectId(rawId);

    // 1. Delete from MongoDB Atlas
    await Team.deleteMany({
      $or: [
        { id: rawId },
        ...(isObjId ? [{ _id: rawId }] : []),
      ],
    });

    // 2. Delete synchronously from local SQLite database (localhost)
    deleteTeamFromSqlite(rawId);

    return res.json({ success: true, message: "Team deleted from database and local storage." });
  } catch (error) {
    console.error("DeleteTeam error:", error);
    return res.status(500).json({ error: "Failed to delete team." });
  }
}
