import mongoose from "mongoose";
const { Schema } = mongoose;

const CustomerSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    country: String,
    contact_person: String,
    email: String,
    phone: String,
    
  },
  { timestamps: true }

);

export const CustomerModel = mongoose.model("Customer", CustomerSchema);
