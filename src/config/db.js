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

  const mongoUri = process.env.MONGO_URI.trim().replace(/^["']|["']$/g, "");
  cachedConnection = mongoose.connect(mongoUri);

  try {
    await cachedConnection;
    console.log("MongoDB connected successfully");
    lastError = null;
    return mongoose.connection;
  } catch (err) {
    cachedConnection = null;
    if (err.reason) {
      // MongooseServerSelectionError contains detailed reason for each node
      lastError = `${err.message} | Reason: ${JSON.stringify(err.reason)}`;
    } else {
      lastError = err.message || err.toString();
    }
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

module.exports = {
  connectDB,
  getLastError: () => lastError
};
