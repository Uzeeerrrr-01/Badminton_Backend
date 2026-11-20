import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    player_id: { type: String, required: true, unique: true },
    full_name: { type: String, required: true, trim: true },
    gender: { type: String, required: true, enum: ["Male", "Female"] },
    contact_email: { type: String, trim: true },
    contact_phone: { type: String, trim: true },
    profile_image: { type: String },
    registration_status: { type: String, default: "Active" },
    eligible_categories: [{ type: String }],
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

function deduplicateConsecutiveWords(str) {
  if (!str || typeof str !== "string") return str;
  return str.replace(/\b(\w+)\s+\1\b/gi, "$1").trim();
}

PlayerSchema.pre("validate", function (next) {
  if (this.full_name) {
    this.full_name = deduplicateConsecutiveWords(this.full_name);
  }
  next();
});

export default mongoose.models.Player || mongoose.model("Player", PlayerSchema);
