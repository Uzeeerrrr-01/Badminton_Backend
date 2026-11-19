import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, default: "Tournament Director" },
    role: { type: String, default: "admin" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.models.Admin || mongoose.model("Admin", AdminSchema);
