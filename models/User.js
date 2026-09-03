import mongoose from "mongoose";
import { ROLE_VALUES } from "@/lib/roles";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true }, // bcrypt hash, never plain text
    name: { type: String, trim: true, default: "" },
    role: { type: String, required: true, enum: ROLE_VALUES },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
