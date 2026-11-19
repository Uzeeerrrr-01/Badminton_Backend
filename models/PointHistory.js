import mongoose from "mongoose";

const PointHistorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    entity_type: { type: String, required: true },
    entity_id: { type: String, required: true },
    entity_name: { type: String, required: true },
    category: { type: String, required: true },
    points_delta: { type: Number, required: true },
    reason: { type: String, required: true },
    adjusted_by: { type: String, default: "Admin" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.models.PointHistory ||
  mongoose.model("PointHistory", PointHistorySchema);
