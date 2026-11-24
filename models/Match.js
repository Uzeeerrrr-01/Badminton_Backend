import mongoose from "mongoose";

const MatchSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    tournamentId: { type: String, default: "apex-badminton-2026", index: true },
    roundId: { type: String, default: null, index: true },
    roundNumber: { type: Number, default: 1 },
    category: { type: String, required: true },
    round: { type: String, default: "Round of 16" },
    match_number: { type: Number },
    court_number: { type: Number, default: 1 },
    scheduled_time: { type: String },
    status: {
      type: String,
      default: "scheduled",
      enum: ["scheduled", "ready", "live", "paused", "completed", "tied", "cancelled"],
    },
    team_a_id: { type: String },
    team_a_name: { type: String, required: true },
    team_a_player1_id: { type: String, required: true },
    team_a_player2_id: { type: String, default: null },
    score_a: { type: Number, default: 0 },
    team_b_id: { type: String },
    team_b_name: { type: String, required: true },
    team_b_player1_id: { type: String, required: true },
    team_b_player2_id: { type: String, default: null },
    score_b: { type: Number, default: 0 },
    serving_team: { type: String, default: "A" },
    serving_player_id: { type: String, default: null },
    receiving_player_id: { type: String, default: null },
    service_court: { type: String, default: "right" },
    team_a_positions: { type: mongoose.Schema.Types.Mixed, default: {} },
    team_b_positions: { type: mongoose.Schema.Types.Mixed, default: {} },
    court_side_a: { type: String, default: "left" },
    toss_winner: { type: String, default: null },
    toss_choice: { type: String, default: null },
    winner_team: { type: String, default: null },
    winner_name: { type: String, default: null },
    loser_team: { type: String, default: null },
    loser_name: { type: String, default: null },
    loser_id: { type: String, default: null },
    points_awarded: { type: Boolean, default: false },
    next_match_id: { type: String, default: null },
    next_match_slot: { type: String, default: null },
    history: { type: [mongoose.Schema.Types.Mixed], default: [] },
    started_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },
    // Timer fields
    timer_duration_seconds: { type: Number, default: 0 },
    timer_enabled: { type: Number, default: 0 },
    timer_status: { type: String, default: "stopped" },
    timer_start_ts: { type: Date, default: null },
    timer_paused_at: { type: Date, default: null },
    timer_remaining_seconds: { type: Number, default: 0 },
    timer_mode: { type: String, default: "COUNTDOWN", enum: ["COUNTDOWN", "SUDDEN_DEATH"] },
    sudden_death_start_ts: { type: Date, default: null },
    is_sudden_death: { type: Boolean, default: false },
    completion_reason: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

function deduplicateConsecutiveWords(str) {
  if (!str || typeof str !== "string") return str;
  return str.replace(/\b(\w+)\s+\1\b/gi, "$1").trim();
}

MatchSchema.pre("validate", function (next) {
  if (this.team_a_name) this.team_a_name = deduplicateConsecutiveWords(this.team_a_name);
  if (this.team_b_name) this.team_b_name = deduplicateConsecutiveWords(this.team_b_name);
  if (this.winner_name) this.winner_name = deduplicateConsecutiveWords(this.winner_name);
  next();
});

export default mongoose.models.Match || mongoose.model("Match", MatchSchema);
