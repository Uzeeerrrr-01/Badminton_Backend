import mongoose from "mongoose";

const TournamentSettingsSchema = new mongoose.Schema(
  {
    id: { type: String, default: "default", unique: true },
    name: { type: String, default: "Apex Badminton Open 2026" },
    description: {
      type: String,
      default:
        "Official collegiate & regional badminton championship with fast-paced 11-point tournament rally scoring.",
    },
    logo_url: { type: String, default: null },
    venue: { type: String, default: "Grand Court Arena, Pavilion Hall" },
    number_of_courts: { type: Number, default: 4 },
    points_per_win: { type: Number, default: 3 },
    points_per_participation: { type: Number, default: 1 },
    bonus_sweep_points: { type: Number, default: 1 },
    ranking_type: { type: String, default: "both" },
    scoring_target_points: { type: Number, default: 11 },
    scoring_deuce_lead: { type: Number, default: 2 },
    scoring_max_points: { type: Number, default: 15 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.models.TournamentSettings ||
  mongoose.model("TournamentSettings", TournamentSettingsSchema);
