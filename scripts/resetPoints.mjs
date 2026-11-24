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
import TournamentPoint from "../models/TournamentPoint.js";
import PointHistory from "../models/PointHistory.js";

async function resetAllPoints() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected successfully.");

  // Check counts before
  const playerCountBefore = await Player.countDocuments();
  const teamCountBefore = await Team.countDocuments();
  const pointsCountBefore = await TournamentPoint.countDocuments();
  const historyCountBefore = await PointHistory.countDocuments();

  console.log("\n--- Before Reset ---");
  console.log(`Players Count: ${playerCountBefore}`);
  console.log(`Teams Count: ${teamCountBefore}`);
  console.log(`TournamentPoint (Points Table) Records: ${pointsCountBefore}`);
  console.log(`PointHistory Records: ${historyCountBefore}`);

  // 1. Delete all points table data
  const deletePointsResult = await TournamentPoint.deleteMany({});
  console.log(`\nDeleted ${deletePointsResult.deletedCount} points table records from TournamentPoint.`);

  // 2. Delete all point adjustment history logs
  const deleteHistoryResult = await PointHistory.deleteMany({});
  console.log(`Deleted ${deleteHistoryResult.deletedCount} history records from PointHistory.`);

  // 3. Reset all players' statistics and points to zero
  const resetPlayersResult = await Player.updateMany(
    {},
    {
      $set: {
        matches_played: 0,
        matches_won: 0,
        matches_lost: 0,
        points_scored: 0,
        points_conceded: 0,
        tournament_points: 0,
        win_rate: 0,
      },
    }
  );
  console.log(`Reset statistics and points to 0 for all ${resetPlayersResult.matchedCount} players.`);

  // 4. Reset all teams' statistics and points to zero
  const resetTeamsResult = await Team.updateMany(
    {},
    {
      $set: {
        matches_played: 0,
        matches_won: 0,
        matches_lost: 0,
        points_scored: 0,
        points_conceded: 0,
        tournament_points: 0,
        win_rate: 0,
      },
    }
  );
  console.log(`Reset statistics and points to 0 for all ${resetTeamsResult.matchedCount} teams.`);

  // Verify counts after
  const playerCountAfter = await Player.countDocuments();
  const teamCountAfter = await Team.countDocuments();
  const pointsCountAfter = await TournamentPoint.countDocuments();
  const historyCountAfter = await PointHistory.countDocuments();

  console.log("\n--- Verification After Reset ---");
  console.log(`Players Count: ${playerCountAfter} (Unchanged: ${playerCountBefore === playerCountAfter})`);
  console.log(`Teams Count: ${teamCountAfter} (Unchanged: ${teamCountBefore === teamCountAfter})`);
  console.log(`TournamentPoint Records: ${pointsCountAfter} (Expected: 0)`);
  console.log(`PointHistory Records: ${historyCountAfter} (Expected: 0)`);

  const playersNonZero = await Player.countDocuments({
    $or: [
      { tournament_points: { $ne: 0 } },
      { matches_played: { $ne: 0 } },
      { points_scored: { $ne: 0 } },
    ],
  });
  console.log(`Players with non-zero stats: ${playersNonZero} (Expected: 0)`);

  const teamsNonZero = await Team.countDocuments({
    $or: [
      { tournament_points: { $ne: 0 } },
      { matches_played: { $ne: 0 } },
      { points_scored: { $ne: 0 } },
    ],
  });
  console.log(`Teams with non-zero stats: ${teamsNonZero} (Expected: 0)`);

  await mongoose.disconnect();
  console.log("\n✅ Reset completed successfully!");
}

resetAllPoints().catch(console.error);
