import mongoose from "mongoose";

const TournamentPointSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    entity_type: { type: String, required: true, enum: ["player", "team"] },
    entity_id: { type: String, required: true },
    entity_name: { type: String, required: true },
    category: { type: String, required: true },
    matches_played: { type: Number, default: 0 },
    matches_won: { type: Number, default: 0 },
    matches_lost: { type: Number, default: 0 },
    points_scored: { type: Number, default: 0 },
    points_conceded: { type: Number, default: 0 },
    total_tournament_points: { type: Number, default: 0 },
    rank: { type: Number, default: 1 },
    category_rank: { type: Number, default: 1 },
    overall_rank: { type: Number, default: 1 },
    win_rate: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

TournamentPointSchema.index({ entity_id: 1, category: 1 }, { unique: true });

export default mongoose.models.TournamentPoint ||
  mongoose.model("TournamentPoint", TournamentPointSchema);
