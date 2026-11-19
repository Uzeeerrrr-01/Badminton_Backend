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

    const players = await Player.find(filter).sort({ full_name: 1 });
    return res.json({ players });
  } catch (error) {
    console.error("GetPlayers error:", error);
    return res.status(500).json({ error: "Failed to fetch players." });
  }
}

export async function getPlayer(req, res) {
  try {
    const player = await Player.findOne({ id: req.params.id });
    if (!player) return res.status(404).json({ error: "Player not found." });
    return res.json({ player });
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

    const total = await Player.countDocuments();
    const playerId = `PLY-${String(total + 1).padStart(3, "0")}`;
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

    Object.assign(player, data);
    player.gender = gender;
    player.eligible_categories = categories;
    player.updated_at = new Date();
    await player.save();

    return res.json({ success: true, player });
  } catch (error) {
    console.error("UpdatePlayer error:", error);
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
