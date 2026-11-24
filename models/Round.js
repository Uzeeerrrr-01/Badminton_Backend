import mongoose from "mongoose";

const ParticipantSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["player", "team"], required: true },
    player1_id: { type: String, required: true },
    player2_id: { type: String, default: null },
    category: { type: String },
    seed: { type: Number, default: null },
    advancementReason: { type: String, enum: ["winner", "bye", "initial_draw"], default: "initial_draw" },
  },
  { _id: false }
);

const PairingExplanationSchema = new mongoose.Schema(
  {
    matchNumber: { type: Number },
    teamA: { type: String },
    teamB: { type: String },
    teamA_rank: { type: Number },
    teamB_rank: { type: Number },
    teamA_points: { type: Number },
    teamB_points: { type: Number },
    explanation: { type: String },
  },
  { _id: false }
);

const RoundSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    tournamentId: { type: String, default: "apex-badminton-2026", index: true },
    category: {
      type: String,
      required: true,
      enum: [
        "Men's Singles",
        "Women's Singles",
        "Men's Doubles",
        "Women's Doubles",
        "Mixed Doubles",
      ],
      index: true,
    },
    roundNumber: { type: Number, required: true },
    roundName: { type: String, required: true }, // e.g. "Round 1", "Round 2", "Quarter-finals", "Semi-finals", "Final"
    status: {
      type: String,
      enum: ["draft", "published", "completed"],
      default: "draft",
      index: true,
    },
    totalTeams: { type: Number, default: 0 },
    participatingTeams: { type: [ParticipantSchema], default: [] },
    qualifiedTeams: { type: [ParticipantSchema], default: [] },
    byeTeam: { type: ParticipantSchema, default: null },
    fixtures: { type: [String], default: [] }, // Array of Match IDs
    pairingExplanation: { type: [PairingExplanationSchema], default: [] },
    createdBy: { type: String, default: "Admin" },
    publishedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Unique compound index: a category can only have one round with a given roundNumber
RoundSchema.index({ category: 1, roundNumber: 1 }, { unique: true });

export default mongoose.models.Round || mongoose.model("Round", RoundSchema);
