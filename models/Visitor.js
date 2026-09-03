import mongoose from "mongoose";
import { VISITOR_PURPOSES } from "@/lib/constants";

const VisitorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    purpose: { type: String, required: true, enum: VISITOR_PURPOSES },
    meetingWith: { type: String, required: true, trim: true },
    entryTime: { type: Date, default: Date.now },
    exitTime: { type: Date, default: null },
    photo: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Visitor || mongoose.model("Visitor", VisitorSchema);
