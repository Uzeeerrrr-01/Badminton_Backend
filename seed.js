import dns from "dns";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
}

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (_) {}

import mongoose from "mongoose";
import Admin from "./models/Admin.js";
import TournamentSettings from "./models/TournamentSettings.js";
import Player from "./models/Player.js";
import Team from "./models/Team.js";
import Match from "./models/Match.js";
import TournamentPoint from "./models/TournamentPoint.js";
import PointHistory from "./models/PointHistory.js";

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<username>")) {
    console.error("Please configure MONGODB_URI in backend/.env before running seed.");
    process.exit(1);
  }

  console.log("[Seed] Connecting to MongoDB Atlas...");
  await mongoose.connect(uri);
  console.log("[Seed] Connected successfully.");

  // 1. Settings
  const settingsCount = await TournamentSettings.countDocuments();
  if (settingsCount === 0) {
    await TournamentSettings.create({
      id: "default",
      name: "Apex Badminton Open 2026",
      description:
        "Official collegiate & regional badminton championship with fast-paced 11-point tournament rally scoring.",
      venue: "Grand Court Arena, Pavilion Hall",
      number_of_courts: 4,
      points_per_win: 3,
      points_per_participation: 1,
      bonus_sweep_points: 1,
      ranking_type: "both",
      scoring_target_points: 11,
      scoring_deuce_lead: 2,
      scoring_max_points: 15,
    });
    console.log("[Seed] Tournament settings created.");
  }

  // 2. Admin
  const adminCount = await Admin.countDocuments();
  if (adminCount === 0) {
    await Admin.create({
      id: "adm-1",
      email: "admin@badminton.org",
      password: "admin123",
      name: "Head Umpire & Tournament Director",
      role: "admin",
    });
    console.log("[Seed] Admin user created: admin@badminton.org / admin123");
  }

  // 3. Players
  const playerCount = await Player.countDocuments();
  if (playerCount === 0) {
    const initialPlayers = [
      { id: "ply-1", player_id: "PLY-001", full_name: "Viktor Axelsen", gender: "Male", contact_email: "viktor@badminton.org", eligible_categories: ["Men's Singles", "Men's Doubles"] },
      { id: "ply-2", player_id: "PLY-002", full_name: "Lee Zii Jia", gender: "Male", contact_email: "lee@badminton.org", eligible_categories: ["Men's Singles", "Men's Doubles"] },
      { id: "ply-3", player_id: "PLY-003", full_name: "An Se-young", gender: "Female", contact_email: "an@badminton.org", eligible_categories: ["Women's Singles", "Mixed Doubles"] },
      { id: "ply-4", player_id: "PLY-004", full_name: "Tai Tzu-ying", gender: "Female", contact_email: "tai@badminton.org", eligible_categories: ["Women's Singles", "Women's Doubles"] },
      { id: "ply-5", player_id: "PLY-005", full_name: "Kevin Sanjaya", gender: "Male", contact_email: "kevin@badminton.org", eligible_categories: ["Men's Doubles", "Mixed Doubles"] },
      { id: "ply-6", player_id: "PLY-006", full_name: "Marcus Gideon", gender: "Male", contact_email: "marcus@badminton.org", eligible_categories: ["Men's Doubles"] },
      { id: "ply-7", player_id: "PLY-007", full_name: "Mohammad Ahsan", gender: "Male", contact_email: "ahsan@badminton.org", eligible_categories: ["Men's Doubles"] },
      { id: "ply-8", player_id: "PLY-008", full_name: "Hendra Setiawan", gender: "Male", contact_email: "hendra@badminton.org", eligible_categories: ["Men's Doubles"] },
      { id: "ply-9", player_id: "PLY-009", full_name: "Huang Yaqiong", gender: "Female", contact_email: "huang@badminton.org", eligible_categories: ["Women's Doubles", "Mixed Doubles"] },
      { id: "ply-10", player_id: "PLY-010", full_name: "Zheng Siwei", gender: "Male", contact_email: "zheng@badminton.org", eligible_categories: ["Mixed Doubles"] },
      { id: "ply-11", player_id: "PLY-011", full_name: "Akane Yamaguchi", gender: "Female", contact_email: "akane@badminton.org", eligible_categories: ["Women's Singles"] },
      { id: "ply-12", player_id: "PLY-012", full_name: "Kodai Naraoka", gender: "Male", contact_email: "kodai@badminton.org", eligible_categories: ["Men's Singles"] },
    ];
    await Player.insertMany(initialPlayers);
    console.log(`[Seed] Seeded ${initialPlayers.length} players.`);

    // 4. Teams
    const initialTeams = [
      { id: "tm-1", name: "Minions (Kevin / Marcus)", category: "Men's Doubles", player1_id: "ply-5", player2_id: "ply-6", status: "Active" },
      { id: "tm-2", name: "The Daddies (Ahsan / Hendra)", category: "Men's Doubles", player1_id: "ply-7", player2_id: "ply-8", status: "Active" },
      { id: "tm-3", name: "Zheng / Huang", category: "Mixed Doubles", player1_id: "ply-10", player2_id: "ply-9", status: "Active" },
    ];
    await Team.insertMany(initialTeams);
    console.log(`[Seed] Seeded ${initialTeams.length} teams.`);

    // 5. Matches
    const initialMatches = [
      {
        id: "mth-1",
        category: "Men's Singles",
        round: "Quarter-finals",
        match_number: 1,
        court_number: 1,
        scheduled_time: "10:00 AM",
        status: "live",
        team_a_name: "Viktor Axelsen",
        team_a_player1_id: "ply-1",
        score_a: 7,
        team_b_name: "Lee Zii Jia",
        team_b_player1_id: "ply-2",
        score_b: 6,
        serving_team: "A",
        serving_player_id: "ply-1",
        receiving_player_id: "ply-2",
        service_court: "left",
        team_a_positions: { left: "ply-1", right: null },
        team_b_positions: { left: "ply-2", right: null },
        court_side_a: "left",
        toss_winner: "A",
        toss_choice: "serve",
        started_at: new Date(),
        timer_enabled: 1,
        timer_duration_seconds: 600,
        timer_remaining_seconds: 480,
        timer_status: "running",
        timer_start_ts: new Date(),
        history: [],
      },
      {
        id: "mth-2",
        category: "Women's Singles",
        round: "Quarter-finals",
        match_number: 2,
        court_number: 2,
        scheduled_time: "10:30 AM",
        status: "scheduled",
        team_a_name: "An Se-young",
        team_a_player1_id: "ply-3",
        score_a: 0,
        team_b_name: "Tai Tzu-ying",
        team_b_player1_id: "ply-4",
        score_b: 0,
        serving_team: "A",
        serving_player_id: "ply-3",
        receiving_player_id: "ply-4",
        service_court: "right",
        team_a_positions: { right: "ply-3", left: null },
        team_b_positions: { right: "ply-4", left: null },
        court_side_a: "left",
        timer_enabled: 1,
        timer_duration_seconds: 600,
        timer_remaining_seconds: 600,
        timer_status: "stopped",
        history: [],
      },
      {
        id: "mth-3",
        category: "Men's Doubles",
        round: "Semi-finals",
        match_number: 3,
        court_number: 3,
        scheduled_time: "11:15 AM",
        status: "scheduled",
        team_a_id: "tm-1",
        team_a_name: "Minions (Kevin / Marcus)",
        team_a_player1_id: "ply-5",
        team_a_player2_id: "ply-6",
        score_a: 0,
        team_b_id: "tm-2",
        team_b_name: "The Daddies (Ahsan / Hendra)",
        team_b_player1_id: "ply-7",
        team_b_player2_id: "ply-8",
        score_b: 0,
        serving_team: "A",
        serving_player_id: "ply-5",
        receiving_player_id: "ply-7",
        service_court: "right",
        team_a_positions: { right: "ply-5", left: "ply-6" },
        team_b_positions: { right: "ply-7", left: "ply-8" },
        court_side_a: "left",
        timer_enabled: 0,
        timer_duration_seconds: 0,
        timer_remaining_seconds: 0,
        timer_status: "stopped",
        history: [],
      },
    ];
    await Match.insertMany(initialMatches);
    console.log(`[Seed] Seeded ${initialMatches.length} matches.`);

    // 6. Tournament points
    const initialPoints = [
      { id: "pts-1", entity_type: "player", entity_id: "ply-3", entity_name: "An Se-young", category: "Women's Singles", matches_played: 1, matches_won: 1, matches_lost: 0, points_scored: 11, points_conceded: 8, total_tournament_points: 4, rank: 1 },
      { id: "pts-2", entity_type: "player", entity_id: "ply-11", entity_name: "Akane Yamaguchi", category: "Women's Singles", matches_played: 1, matches_won: 0, matches_lost: 1, points_scored: 8, points_conceded: 11, total_tournament_points: 1, rank: 2 },
      { id: "pts-3", entity_type: "player", entity_id: "ply-1", entity_name: "Viktor Axelsen", category: "Men's Singles", matches_played: 0, matches_won: 0, matches_lost: 0, points_scored: 0, points_conceded: 0, total_tournament_points: 0, rank: 1 },
      { id: "pts-4", entity_type: "player", entity_id: "ply-2", entity_name: "Lee Zii Jia", category: "Men's Singles", matches_played: 0, matches_won: 0, matches_lost: 0, points_scored: 0, points_conceded: 0, total_tournament_points: 0, rank: 2 },
    ];
    await TournamentPoint.insertMany(initialPoints);
    console.log(`[Seed] Seeded ${initialPoints.length} tournament point records.`);
  }

  console.log("[Seed] Completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("[Seed] Error:", err);
  process.exit(1);
});
