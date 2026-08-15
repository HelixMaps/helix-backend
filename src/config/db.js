const mongoose = require("mongoose");

let cachedConnection = null;
let lastError = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedConnection) {
    try {
      await cachedConnection;
      return mongoose.connection;
    } catch (err) {
      cachedConnection = null;
    }
  }

  if (!process.env.MONGO_URI) {
    const err = new Error("MONGO_URI environment variable is missing");
    lastError = err.message;
    throw err;
  }

  cachedConnection = mongoose.connect(process.env.MONGO_URI);

  try {
    await cachedConnection;
    console.log("MongoDB connected successfully");
    lastError = null;
    return mongoose.connection;
  } catch (err) {
    cachedConnection = null;
    lastError = err.message || err.toString();
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

module.exports = {
  connectDB,
  getLastError: () => lastError
};
