import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  customer_id: String,
  name: String,
  status: String,
  industry: String,
  contact: {
    person: String,
    email: String,
    phone: String,
  },
  address: {
    line1: String,
    city: String,
    state: String,
    country: String,
    zipcode: String,
  },
  created_at: Date,
});

export const Customer = mongoose.model("Customer", customerSchema);
