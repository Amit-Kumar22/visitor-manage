import mongoose from "mongoose";

const GuestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    photo: { type: String, required: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
    designation: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    registrationId: { type: String, required: true, unique: true },
    registrationTime: { type: Date, default: Date.now },
    checkInTime: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Guest || mongoose.model("Guest", GuestSchema);
