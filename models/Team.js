import mongoose from "mongoose";

const TeamSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    player1_id: { type: String, required: true },
    player2_id: { type: String, required: true },
    status: { type: String, default: "Active" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.models.Team || mongoose.model("Team", TeamSchema);
