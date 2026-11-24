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
import Match from "../models/Match.js";
import Round from "../models/Round.js";
import TournamentPoint from "../models/TournamentPoint.js";
import PointHistory from "../models/PointHistory.js";

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  console.log("Players count:", await Player.countDocuments());
  console.log("Teams count:", await Team.countDocuments());
  console.log("Matches count:", await Match.countDocuments());
  console.log("Rounds count:", await Round.countDocuments());
  console.log("TournamentPoint count:", await TournamentPoint.countDocuments());
  console.log("PointHistory count:", await PointHistory.countDocuments());

  const samplePoints = await TournamentPoint.find().limit(5);
  console.log("Sample TournamentPoint records:", samplePoints);

  const playersWithPoints = await Player.find({ tournament_points: { $gt: 0 } });
  console.log("Players with >0 points:", playersWithPoints.length);

  const teamsWithPoints = await Team.find({ tournament_points: { $gt: 0 } });
  console.log("Teams with >0 points:", teamsWithPoints.length);

  await mongoose.disconnect();
}

check().catch(console.error);
