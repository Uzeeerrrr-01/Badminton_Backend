import Player from "../models/Player.js";
import Team from "../models/Team.js";
import mongoose from "mongoose";
import { deletePlayerFromSqlite } from "../services/sqliteSync.js";

function validateCategoryEligibility(gender, categories) {
  if (!categories || !Array.isArray(categories)) return;
  for (const cat of categories) {
    if (gender === "Male") {
      if (cat.includes("Women's")) {
        throw new Error(`Incompatible category: Male player cannot participate in ${cat}`);
      }
    } else if (gender === "Female") {
      if (cat.includes("Men's")) {
        throw new Error(`Incompatible category: Female player cannot participate in ${cat}`);
      }
    }
  }
}

export async function getPlayers(req, res) {
  try {
    const { category, gender, search } = req.query;
    const filter = {};

    if (gender) filter.gender = gender;
    if (category) filter.eligible_categories = category;
    if (search) {
      filter.$or = [
        { full_name: { $regex: search, $options: "i" } },
        { player_id: { $regex: search, $options: "i" } },
        { contact_email: { $regex: search, $options: "i" } },
      ];
    }

    const players = await Player.find(filter).sort({ full_name: 1 }).lean();

    // Enrich players with doubles and mixed doubles partnerships
    const allTeams = await Team.find({ status: { $ne: "Withdrawn" } }).lean();
    const allPlayers = await Player.find({}).lean();
    const playerNameMap = new Map();
    allPlayers.forEach((p) => {
      playerNameMap.set(p.id, p.full_name);
      if (p.player_id) playerNameMap.set(p.player_id, p.full_name);
    });

    const partnerMap = new Map();
    allTeams.forEach((t) => {
      const p1Id = t.player1_id;
      const p2Id = t.player2_id;
      const p1Name = playerNameMap.get(p1Id) || "Partner";
      const p2Name = playerNameMap.get(p2Id) || "Partner";

      if (p1Id) {
        if (!partnerMap.has(p1Id)) partnerMap.set(p1Id, []);
        partnerMap.get(p1Id).push({
          category: t.category,
          team_id: t.id,
          team_name: t.name,
          partner_id: p2Id,
          partner_name: p2Name,
        });
      }

      if (p2Id) {
        if (!partnerMap.has(p2Id)) partnerMap.set(p2Id, []);
        partnerMap.get(p2Id).push({
          category: t.category,
          team_id: t.id,
          team_name: t.name,
          partner_id: p1Id,
          partner_name: p1Name,
        });
      }
    });

    const enrichedPlayers = players.map((p) => ({
      ...p,
      partnerships: partnerMap.get(p.id) || partnerMap.get(p.player_id) || [],
    }));

    return res.json({ players: enrichedPlayers });
  } catch (error) {
    console.error("GetPlayers error:", error);
    return res.status(500).json({ error: "Failed to fetch players." });
  }
}

export async function getPlayer(req, res) {
  try {
    const player = await Player.findOne({ id: req.params.id }).lean();
    if (!player) return res.status(404).json({ error: "Player not found." });

    const teams = await Team.find({
      $or: [{ player1_id: player.id }, { player2_id: player.id }],
      status: { $ne: "Withdrawn" },
    }).lean();

    const partnerships = [];
    for (const t of teams) {
      const partnerId = t.player1_id === player.id ? t.player2_id : t.player1_id;
      const partner = await Player.findOne({ id: partnerId }).lean();
      partnerships.push({
        category: t.category,
        team_id: t.id,
        team_name: t.name,
        partner_id: partnerId,
        partner_name: partner ? partner.full_name : "Partner",
      });
    }

    return res.json({ player: { ...player, partnerships } });
  } catch (error) {
    console.error("GetPlayer error:", error);
    return res.status(500).json({ error: "Failed to fetch player." });
  }
}

export async function createPlayer(req, res) {
  try {
    const data = req.body;
    if (!data.full_name || !data.gender) {
      return res.status(400).json({ error: "Full name and gender are required." });
    }

    const categories = Array.isArray(data.eligible_categories) ? data.eligible_categories : [];
    validateCategoryEligibility(data.gender, categories);

    let playerId = data.player_id ? String(data.player_id).trim().toUpperCase() : null;

    if (playerId) {
      // Validate custom or user-provided player_id is not already taken
      const existing = await Player.findOne({ player_id: playerId });
      if (existing) {
        return res.status(400).json({
          error: `Player ID "${playerId}" is already in use by competitor ${existing.full_name}. Please choose a different ID or leave blank to auto-generate.`,
        });
      }
    } else {
      // Find the maximum existing numeric suffix to guarantee a collision-free sequential ID
      const allPlayers = await Player.find({ player_id: /^PLY-\d+$/i }, { player_id: 1 }).lean();
      let maxNum = 0;
      for (const p of allPlayers) {
        const match = p.player_id?.match(/^PLY-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }

      let candidateNum = Math.max(maxNum + 1, 1);
      playerId = `PLY-${String(candidateNum).padStart(3, "0")}`;

      // Double-check existence to ensure 100% uniqueness
      while (await Player.exists({ player_id: playerId })) {
        candidateNum++;
        playerId = `PLY-${String(candidateNum).padStart(3, "0")}`;
      }
    }

    const id = `ply-${Date.now().toString(36)}`;

    const player = await Player.create({
      id,
      player_id: playerId,
      full_name: data.full_name,
      gender: data.gender,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      profile_image: data.profile_image || null,
      registration_status: data.registration_status || "Active",
      eligible_categories: categories,
    });

    return res.status(201).json({ success: true, player });
  } catch (error) {
    console.error("CreatePlayer error:", error);
    if (error.code === 11000) {
      const dupId = error.keyValue?.player_id || "the specified value";
      return res.status(400).json({
        error: `Player ID "${dupId}" already exists in the tournament. Please provide a unique ID.`,
      });
    }
    return res.status(400).json({ error: error.message || "Failed to create player." });
  }
}

export async function updatePlayer(req, res) {
  try {
    const data = req.body;
    const player = await Player.findOne({ id: req.params.id });
    if (!player) return res.status(404).json({ error: "Player not found." });

    const gender = data.gender || player.gender;
    const categories =
      data.eligible_categories !== undefined ? data.eligible_categories : player.eligible_categories;

    validateCategoryEligibility(gender, categories);

    if (data.player_id && data.player_id.trim().toUpperCase() !== player.player_id) {
      const newPlayerId = data.player_id.trim().toUpperCase();
      const existing = await Player.findOne({ player_id: newPlayerId });
      if (existing) {
        return res.status(400).json({
          error: `Player ID "${newPlayerId}" is already assigned to competitor ${existing.full_name}.`,
        });
      }
      player.player_id = newPlayerId;
    }

    Object.assign(player, data);
    player.gender = gender;
    player.eligible_categories = categories;
    player.updated_at = new Date();
    await player.save();

    return res.json({ success: true, player });
  } catch (error) {
    console.error("UpdatePlayer error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        error: "A player with this Player ID already exists. Please choose a unique ID.",
      });
    }
    return res.status(400).json({ error: error.message || "Failed to update player." });
  }
}

export async function deletePlayer(req, res) {
  try {
    const rawId = req.params.id;
    const isObjId = mongoose.isValidObjectId(rawId);

    // 1. Locate player first to capture both id and player_id
    const player = await Player.findOne({
      $or: [
        { id: rawId },
        { player_id: rawId },
        ...(isObjId ? [{ _id: rawId }] : []),
      ],
    });

    const targetId = player?.id || rawId;
    const targetPlayerId = player?.player_id || rawId;

    // 2. Delete from MongoDB Atlas
    const result = await Player.deleteMany({
      $or: [
        { id: targetId },
        { player_id: targetPlayerId },
        ...(isObjId ? [{ _id: rawId }] : []),
      ],
    });

    // Also remove any teams where this player is partnered
    await Team.deleteMany({
      $or: [
        { player1_id: targetId },
        { player2_id: targetId },
        { player1_id: targetPlayerId },
        { player2_id: targetPlayerId },
      ],
    });

    // 3. Delete synchronously from local SQLite database (localhost)
    deletePlayerFromSqlite(targetId, targetPlayerId);

    return res.json({ success: true, message: "Player deleted from database and local storage." });
  } catch (error) {
    console.error("DeletePlayer error:", error);
    return res.status(500).json({ error: "Failed to delete player." });
  }
}
