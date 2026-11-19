import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

let _db = null;

export function getSqliteDb() {
  if (_db) return _db;

  // Resolve path to data/badminton.sqlite
  const candidates = [
    path.join(process.cwd(), "data", "badminton.sqlite"),
    path.join(process.cwd(), "..", "data", "badminton.sqlite"),
    path.resolve("c:/Users/hp/Desktop/badmintonm/data/badminton.sqlite"),
  ];

  let resolvedPath = candidates[0];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      resolvedPath = p;
      break;
    }
  }

  try {
    _db = new DatabaseSync(resolvedPath);
    return _db;
  } catch (err) {
    console.error("Failed to connect to local SQLite database:", err.message);
    return null;
  }
}

/**
 * Delete player from local SQLite database and remove associated teams
 */
export function deletePlayerFromSqlite(id, playerId) {
  try {
    const db = getSqliteDb();
    if (!db) return;

    // Delete associated teams
    db.prepare("DELETE FROM teams WHERE player1_id = ? OR player2_id = ? OR player1_id = ? OR player2_id = ?")
      .run(id || "", id || "", playerId || "", playerId || "");

    // Delete player
    db.prepare("DELETE FROM players WHERE id = ? OR player_id = ?")
      .run(id || "", playerId || "");

    // Delete points
    db.prepare("DELETE FROM tournament_points WHERE entity_id = ? OR entity_id = ?")
      .run(id || "", playerId || "");

    db.prepare("DELETE FROM points_history WHERE entity_id = ? OR entity_id = ?")
      .run(id || "", playerId || "");

    console.log(`[SqliteSync] Deleted player ${id} / ${playerId} from local SQLite.`);
  } catch (err) {
    console.error(`[SqliteSync] Error deleting player ${id} from SQLite:`, err.message);
  }
}

/**
 * Delete team from local SQLite database
 */
export function deleteTeamFromSqlite(id) {
  try {
    const db = getSqliteDb();
    if (!db) return;

    db.prepare("DELETE FROM teams WHERE id = ?").run(id);
    db.prepare("DELETE FROM tournament_points WHERE entity_id = ?").run(id);
    db.prepare("DELETE FROM points_history WHERE entity_id = ?").run(id);

    console.log(`[SqliteSync] Deleted team ${id} from local SQLite.`);
  } catch (err) {
    console.error(`[SqliteSync] Error deleting team ${id} from SQLite:`, err.message);
  }
}

/**
 * Delete match from local SQLite database
 */
export function deleteMatchFromSqlite(id) {
  try {
    const db = getSqliteDb();
    if (!db) return;

    db.prepare("DELETE FROM matches WHERE id = ?").run(id);

    console.log(`[SqliteSync] Deleted match ${id} from local SQLite.`);
  } catch (err) {
    console.error(`[SqliteSync] Error deleting match ${id} from SQLite:`, err.message);
  }
}

/**
 * Synchronize match document to local SQLite database (full upsert)
 */
export function syncMatchToSqlite(match) {
  try {
    const db = getSqliteDb();
    if (!db || !match) return;

    // Ensure columns exist in SQLite
    try { db.exec("ALTER TABLE matches ADD COLUMN timer_mode TEXT DEFAULT 'COUNTDOWN'"); } catch (_) {}
    try { db.exec("ALTER TABLE matches ADD COLUMN sudden_death_start_ts TEXT DEFAULT NULL"); } catch (_) {}
    try { db.exec("ALTER TABLE matches ADD COLUMN is_sudden_death INTEGER DEFAULT 0"); } catch (_) {}

    const now = new Date().toISOString();
    const historyJson = Array.isArray(match.history) ? JSON.stringify(match.history) : (typeof match.history === "string" ? match.history : "[]");
    const posAJson = typeof match.team_a_positions === "object" ? JSON.stringify(match.team_a_positions) : (match.team_a_positions || "{}");
    const posBJson = typeof match.team_b_positions === "object" ? JSON.stringify(match.team_b_positions) : (match.team_b_positions || "{}");

    const startedAt = match.started_at ? (match.started_at.toISOString ? match.started_at.toISOString() : String(match.started_at)) : null;
    const completedAt = match.completed_at ? (match.completed_at.toISOString ? match.completed_at.toISOString() : String(match.completed_at)) : null;
    const timerStartTs = match.timer_start_ts ? (match.timer_start_ts.toISOString ? match.timer_start_ts.toISOString() : String(match.timer_start_ts)) : null;
    const timerPausedAt = match.timer_paused_at ? (match.timer_paused_at.toISOString ? match.timer_paused_at.toISOString() : String(match.timer_paused_at)) : null;
    const suddenDeathTs = match.sudden_death_start_ts ? (match.sudden_death_start_ts.toISOString ? match.sudden_death_start_ts.toISOString() : String(match.sudden_death_start_ts)) : null;

    db.prepare(`
      INSERT INTO matches (
        id, category, round, match_number, court_number, scheduled_time, status,
        team_a_id, team_a_name, team_a_player1_id, team_a_player2_id, score_a,
        team_b_id, team_b_name, team_b_player1_id, team_b_player2_id, score_b,
        serving_team, serving_player_id, receiving_player_id, service_court,
        team_a_positions, team_b_positions, court_side_a, toss_winner, toss_choice,
        winner_team, winner_name, next_match_id, next_match_slot, history,
        started_at, completed_at, timer_duration_seconds, timer_enabled, timer_status,
        timer_start_ts, timer_paused_at, timer_remaining_seconds, completion_reason,
        timer_mode, sudden_death_start_ts, is_sudden_death, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        category = excluded.category,
        round = excluded.round,
        match_number = excluded.match_number,
        court_number = excluded.court_number,
        scheduled_time = excluded.scheduled_time,
        status = excluded.status,
        team_a_id = excluded.team_a_id,
        team_a_name = excluded.team_a_name,
        team_a_player1_id = excluded.team_a_player1_id,
        team_a_player2_id = excluded.team_a_player2_id,
        score_a = excluded.score_a,
        team_b_id = excluded.team_b_id,
        team_b_name = excluded.team_b_name,
        team_b_player1_id = excluded.team_b_player1_id,
        team_b_player2_id = excluded.team_b_player2_id,
        score_b = excluded.score_b,
        serving_team = excluded.serving_team,
        serving_player_id = excluded.serving_player_id,
        receiving_player_id = excluded.receiving_player_id,
        service_court = excluded.service_court,
        team_a_positions = excluded.team_a_positions,
        team_b_positions = excluded.team_b_positions,
        court_side_a = excluded.court_side_a,
        toss_winner = excluded.toss_winner,
        toss_choice = excluded.toss_choice,
        winner_team = excluded.winner_team,
        winner_name = excluded.winner_name,
        next_match_id = excluded.next_match_id,
        next_match_slot = excluded.next_match_slot,
        history = excluded.history,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        timer_duration_seconds = excluded.timer_duration_seconds,
        timer_enabled = excluded.timer_enabled,
        timer_status = excluded.timer_status,
        timer_start_ts = excluded.timer_start_ts,
        timer_paused_at = excluded.timer_paused_at,
        timer_remaining_seconds = excluded.timer_remaining_seconds,
        completion_reason = excluded.completion_reason,
        timer_mode = excluded.timer_mode,
        sudden_death_start_ts = excluded.sudden_death_start_ts,
        is_sudden_death = excluded.is_sudden_death,
        updated_at = excluded.updated_at
    `).run(
      match.id, match.category, match.round || "Round of 16", Number(match.match_number || 1), Number(match.court_number || 1), match.scheduled_time || null, match.status || "scheduled",
      match.team_a_id || null, match.team_a_name, match.team_a_player1_id, match.team_a_player2_id || null, Number(match.score_a || 0),
      match.team_b_id || null, match.team_b_name, match.team_b_player1_id, match.team_b_player2_id || null, Number(match.score_b || 0),
      match.serving_team || "A", match.serving_player_id || null, match.receiving_player_id || null, match.service_court || "right",
      posAJson, posBJson, match.court_side_a || "left", match.toss_winner || null, match.toss_choice || null,
      match.winner_team || null, match.winner_name || null, match.next_match_id || null, match.next_match_slot || null, historyJson,
      startedAt, completedAt, Number(match.timer_duration_seconds || 0), match.timer_enabled ? 1 : 0, match.timer_status || "stopped",
      timerStartTs, timerPausedAt, Number(match.timer_remaining_seconds || 0), match.completion_reason || null,
      match.timer_mode || "COUNTDOWN", suddenDeathTs, match.is_sudden_death ? 1 : 0, now
    );
  } catch (err) {
    console.error(`[SqliteSync] Error syncing match ${match?.id} to SQLite:`, err.message);
  }
}
