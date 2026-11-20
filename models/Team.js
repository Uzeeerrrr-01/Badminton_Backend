import mongoose from "mongoose";

const TeamSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    player1_id: { type: String, required: true },
    player2_id: { type: String, required: true },
    status: { type: String, default: "Active" },
    // Cumulative Tournament Statistics
    matches_played: { type: Number, default: 0 },
    matches_won: { type: Number, default: 0 },
    matches_lost: { type: Number, default: 0 },
    points_scored: { type: Number, default: 0 },
    points_conceded: { type: Number, default: 0 },
    tournament_points: { type: Number, default: 0 },
    win_rate: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.models.Team || mongoose.model("Team", TeamSchema);
