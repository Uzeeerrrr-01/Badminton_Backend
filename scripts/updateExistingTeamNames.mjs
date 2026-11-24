import dns from "dns";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (_) {}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import mongoose from "mongoose";
import Player from "../models/Player.js";
import Team from "../models/Team.js";

async function updateExistingTeams() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas.");

  const teams = await Team.find();
  console.log(`Found ${teams.length} teams to update.`);

  for (const t of teams) {
    const p1 = await Player.findOne({ id: t.player1_id });
    const p2 = await Player.findOne({ id: t.player2_id });

    if (p1 && p2) {
      const oldName = t.name;
      const newName = `Team ${p1.full_name} and ${p2.full_name}`;
      t.name = newName;
      t.updated_at = new Date();
      await t.save();
      console.log(`Updated: "${oldName}" -> "${newName}"`);
    } else {
      console.warn(`Could not find players for team ${t.id} (${t.name})`);
    }
  }

  console.log("\nAll teams updated successfully!");
  await mongoose.disconnect();
}

updateExistingTeams().catch(console.error);
