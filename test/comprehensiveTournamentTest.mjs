import dns from "dns";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import assert from "assert";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (_) {}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import mongoose from "mongoose";
import Round from "../models/Round.js";
import Match from "../models/Match.js";
import Player from "../models/Player.js";
import Team from "../models/Team.js";
import TournamentSettings from "../models/TournamentSettings.js";
import {
  generateRound1Fixtures,
  generateSubsequentRoundFixtures,
  determineRoundName,
  computeCategoryStandings,
} from "../services/roundFixtureService.js";
import { checkWinner } from "../services/scoringEngine.js";

async function runTests() {
  console.log("==================================================================");
  console.log("🏸 BADMINTON TOURNAMENT AUTOMATIC ROUND & FIXTURE TEST SUITE");
  console.log("==================================================================");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB Atlas");

  // Helper mock team generator
  function createMockCompetitors(count, category = "Men's Doubles", type = "team") {
    return Array.from({ length: count }, (_, i) => ({
      id: `mock-${category.replace(/[^a-zA-Z0-9]/g, "_")}-${i + 1}`,
      name: `Team ${String.fromCharCode(65 + i)}`,
      type,
      player1_id: `ply-${i * 2 + 1}`,
      player2_id: type === "team" ? `ply-${i * 2 + 2}` : null,
      category,
      seed: i + 1,
      advancementReason: "initial_draw",
    }));
  }

  // TEST 1: 2 teams -> 1 match
  {
    console.log("\n--- TEST 1: 2 teams -> 1 match ---");
    const competitors = createMockCompetitors(2);
    const result = generateRound1Fixtures({ competitors, category: "Men's Doubles" });
    assert.strictEqual(result.fixtures.length, 1, "Must generate exactly 1 match");
    assert.strictEqual(result.byeTeam, null, "Must not allocate a bye for 2 teams");
    assert.strictEqual(result.roundName, "Final", "2 teams round should be named Final");
    console.log("✅ Test 1 Passed: 2 teams generated exactly 1 match (Final)");
  }

  // TEST 2: 4 teams -> 2 matches
  {
    console.log("\n--- TEST 2: 4 teams -> 2 matches ---");
    const competitors = createMockCompetitors(4);
    const result = generateRound1Fixtures({ competitors, category: "Men's Doubles" });
    assert.strictEqual(result.fixtures.length, 2, "Must generate exactly 2 matches");
    assert.strictEqual(result.byeTeam, null, "Must not allocate a bye for 4 teams");
    assert.strictEqual(result.roundName, "Semi-finals", "4 teams round should be named Semi-finals");
    console.log("✅ Test 2 Passed: 4 teams generated exactly 2 matches (Semi-finals)");
  }

  // TEST 3: 5 teams -> 2 matches + 1 bye
  {
    console.log("\n--- TEST 3: 5 teams -> 2 matches + 1 bye ---");
    const competitors = createMockCompetitors(5);
    const result = generateRound1Fixtures({ competitors, category: "Men's Doubles" });
    assert.strictEqual(result.fixtures.length, 2, "Must generate exactly 2 matches");
    assert.notStrictEqual(result.byeTeam, null, "Must allocate a bye for 5 teams");
    assert.strictEqual(result.roundName, "Quarter-finals", "5 teams round should be named Quarter-finals");
    console.log(`✅ Test 3 Passed: 5 teams generated 2 matches + 1 bye to ${result.byeTeam.name}`);
  }

  // TEST 4: 6 teams -> 3 matches
  {
    console.log("\n--- TEST 4: 6 teams -> 3 matches ---");
    const competitors = createMockCompetitors(6);
    const result = generateRound1Fixtures({ competitors, category: "Men's Doubles" });
    assert.strictEqual(result.fixtures.length, 3, "Must generate exactly 3 matches");
    assert.strictEqual(result.byeTeam, null, "Must not allocate a bye for 6 teams");
    assert.strictEqual(result.roundName, "Quarter-finals", "6 teams round should be named Quarter-finals");
    console.log("✅ Test 4 Passed: 6 teams generated exactly 3 matches (Quarter-finals)");
  }

  // TEST 5: 7 teams -> 3 matches + 1 bye
  {
    console.log("\n--- TEST 5: 7 teams -> 3 matches + 1 bye ---");
    const competitors = createMockCompetitors(7);
    const result = generateRound1Fixtures({ competitors, category: "Men's Doubles" });
    assert.strictEqual(result.fixtures.length, 3, "Must generate exactly 3 matches");
    assert.notStrictEqual(result.byeTeam, null, "Must allocate a bye for 7 teams");
    assert.strictEqual(result.roundName, "Quarter-finals", "7 teams round should be named Quarter-finals");
    console.log(`✅ Test 5 Passed: 7 teams generated 3 matches + 1 bye to ${result.byeTeam.name}`);
  }

  // TEST 6: 8 teams -> 4 matches
  {
    console.log("\n--- TEST 6: 8 teams -> 4 matches ---");
    const competitors = createMockCompetitors(8);
    const result = generateRound1Fixtures({ competitors, category: "Men's Doubles" });
    assert.strictEqual(result.fixtures.length, 4, "Must generate exactly 4 matches");
    assert.strictEqual(result.byeTeam, null, "Must not allocate a bye for 8 teams");
    assert.strictEqual(result.roundName, "Quarter-finals", "8 teams round should be named Quarter-finals");
    console.log("✅ Test 6 Passed: 8 teams generated exactly 4 matches (Quarter-finals)");
  }

  // TEST 7: 9 teams -> 4 matches + 1 bye
  {
    console.log("\n--- TEST 7: 9 teams -> 4 matches + 1 bye ---");
    const competitors = createMockCompetitors(9);
    const result = generateRound1Fixtures({ competitors, category: "Men's Doubles" });
    assert.strictEqual(result.fixtures.length, 4, "Must generate exactly 4 matches");
    assert.notStrictEqual(result.byeTeam, null, "Must allocate a bye for 9 teams");
    assert.strictEqual(result.roundName, "Round of 16", "9 teams round should be named Round of 16");
    console.log(`✅ Test 7 Passed: 9 teams generated 4 matches + 1 bye to ${result.byeTeam.name}`);
  }

  // TEST 8: 10 teams -> 5 matches
  {
    console.log("\n--- TEST 8: 10 teams -> 5 matches ---");
    const competitors = createMockCompetitors(10);
    const result = generateRound1Fixtures({ competitors, category: "Men's Doubles" });
    assert.strictEqual(result.fixtures.length, 5, "Must generate exactly 5 matches");
    assert.strictEqual(result.byeTeam, null, "Must not allocate a bye for 10 teams");
    assert.strictEqual(result.roundName, "Round of 16", "10 teams round should be named Round of 16");
    console.log("✅ Test 8 Passed: 10 teams generated exactly 5 matches (Round of 16)");
  }

  // TEST 9: Subsequent round odd teams handling (3 qualified teams)
  {
    console.log("\n--- TEST 9: 3 qualified teams in subsequent round ---");
    const qualifiedTeams = [
      { id: "tm-top", name: "Team Top Seed", type: "team", player1_id: "p1", player2_id: "p2" },
      { id: "tm-mid", name: "Team Mid Seed", type: "team", player1_id: "p3", player2_id: "p4" },
      { id: "tm-low", name: "Team Low Seed", type: "team", player1_id: "p5", player2_id: "p6" },
    ];

    // Seed mock completed matches to give tm-top highest points
    const testCat = "Test-Category-R3";
    await Match.deleteMany({ category: testCat });
    await Match.create([
      {
        id: "test-m1",
        category: testCat,
        roundNumber: 1,
        team_a_id: "tm-top",
        team_a_name: "Team Top Seed",
        team_a_player1_id: "p1",
        team_b_id: "tm-x",
        team_b_name: "Team X",
        team_b_player1_id: "px",
        score_a: 11,
        score_b: 3,
        status: "completed",
        winner_team: "A",
        winner_name: "Team Top Seed",
      },
      {
        id: "test-m2",
        category: testCat,
        roundNumber: 1,
        team_a_id: "tm-mid",
        team_a_name: "Team Mid Seed",
        team_a_player1_id: "p3",
        team_b_id: "tm-y",
        team_b_name: "Team Y",
        team_b_player1_id: "py",
        score_a: 11,
        score_b: 8,
        status: "completed",
        winner_team: "A",
        winner_name: "Team Mid Seed",
      },
      {
        id: "test-m3",
        category: testCat,
        roundNumber: 1,
        team_a_id: "tm-low",
        team_a_name: "Team Low Seed",
        team_a_player1_id: "p5",
        team_b_id: "tm-z",
        team_b_name: "Team Z",
        team_b_player1_id: "pz",
        score_a: 11,
        score_b: 9,
        status: "completed",
        winner_team: "A",
        winner_name: "Team Low Seed",
      },
    ]);

    const result = await generateSubsequentRoundFixtures({
      category: testCat,
      roundNumber: 2,
      qualifiedTeams,
    });

    assert.notStrictEqual(result.byeTeam, null, "Must allocate a bye for 3 qualified teams");
    assert.strictEqual(result.byeTeam.id, "tm-top", "Top-ranked team must receive the subsequent round bye");
    assert.strictEqual(result.fixtures.length, 1, "Remaining 2 teams must play 1 match");
    assert.strictEqual(result.fixtures[0].team_a_id, "tm-mid", "Remaining match must feature mid vs low");
    assert.strictEqual(result.fixtures[0].team_b_id, "tm-low", "Remaining match must feature mid vs low");

    console.log(`✅ Test 9 Passed: Top-ranked ${result.byeTeam.name} received BYE; remaining 2 teams paired in 1 match`);

    // Clean up
    await Match.deleteMany({ category: testCat });
  }

  // TEST 10: Equal points tie-breakers applied correctly
  {
    console.log("\n--- TEST 10: Tie-breakers verification ---");
    const testCat = "Test-Category-TB";
    await Match.deleteMany({ category: testCat });

    // Team A and Team B have equal match points (4 pts each, 1 win)
    // Team A has rally diff: 11 - 5 = +6
    // Team B has rally diff: 11 - 8 = +3
    // Team A should rank higher than Team B
    await Match.create([
      {
        id: "tb-m1",
        category: testCat,
        roundNumber: 1,
        team_a_id: "team-a",
        team_a_name: "Team A",
        team_a_player1_id: "pa",
        team_b_id: "team-x",
        team_b_name: "Team X",
        team_b_player1_id: "px",
        score_a: 11,
        score_b: 5,
        status: "completed",
        winner_team: "A",
        winner_name: "Team A",
      },
      {
        id: "tb-m2",
        category: testCat,
        roundNumber: 1,
        team_a_id: "team-b",
        team_a_name: "Team B",
        team_a_player1_id: "pb",
        team_b_id: "team-y",
        team_b_name: "Team Y",
        team_b_player1_id: "py",
        score_a: 11,
        score_b: 8,
        status: "completed",
        winner_team: "A",
        winner_name: "Team B",
      },
    ]);

    const standings = await computeCategoryStandings(testCat);
    assert.strictEqual(standings[0].id, "team-a", "Team A with +6 diff must rank #1");
    assert.strictEqual(standings[1].id, "team-b", "Team B with +3 diff must rank #2");
    console.log("✅ Test 10 Passed: Rally point differential correctly broke equal-points tie");

    // Clean up
    await Match.deleteMany({ category: testCat });
  }

  // TEST 11: All 5 categories independence
  {
    console.log("\n--- TEST 11: Five categories independent isolation ---");
    const allCats = [
      "Men's Singles",
      "Women's Singles",
      "Men's Doubles",
      "Women's Doubles",
      "Mixed Doubles",
    ];

    for (const cat of allCats) {
      const comps = createMockCompetitors(4, cat, cat.includes("Singles") ? "player" : "team");
      const r = generateRound1Fixtures({ competitors: comps, category: cat });
      assert.strictEqual(r.fixtures.length, 2);
      r.fixtures.forEach((f) => {
        assert.strictEqual(f.category, cat, `Fixture category must be strictly ${cat}`);
      });
    }
    console.log("✅ Test 11 Passed: All 5 categories generated independently with zero cross-matching");
  }

  // TEST 12: Scoring rules check (11-pt format, sudden death at 14-14)
  {
    console.log("\n--- TEST 12: Scoring engine rules verification ---");
    assert.strictEqual(checkWinner(11, 8), "A", "11-8 should win for A");
    assert.strictEqual(checkWinner(9, 11), "B", "9-11 should win for B");
    assert.strictEqual(checkWinner(10, 10), null, "10-10 is deuce, no winner");
    assert.strictEqual(checkWinner(11, 10), null, "11-10 requires 2 clear points");
    assert.strictEqual(checkWinner(12, 10), "A", "12-10 is 2-point lead win for A");
    assert.strictEqual(checkWinner(14, 14), null, "14-14 sudden death in progress");
    assert.strictEqual(checkWinner(15, 14), "A", "15-14 sudden death point won by A");
    console.log("✅ Test 12 Passed: 11-point format, deuce, and sudden death rules strictly verified");
  }

  console.log("\n==================================================================");
  console.log("🎉 ALL 12 TEST SUITE SCENARIOS PASSED WITH ZERO ERRORS!");
  console.log("==================================================================");
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test Suite Failure:", err);
  process.exit(1);
});
