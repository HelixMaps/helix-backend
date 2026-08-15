const mongoose = require("mongoose");

let lastError = null;

async function connectDB() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is missing");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
    lastError = null;
  } catch (err) {
    lastError = err.message || err.toString();
    console.error("MongoDB connection error:", err);
  }
}

module.exports = {
  connectDB,
  getLastError: () => lastError
};
