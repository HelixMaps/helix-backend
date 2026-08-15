require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const mapRoutes = require("./routes/mapRoutes");
const { connectDB, getLastError } = require("./config/db");

const app = express();

// Database Connection Middleware for Serverless Environments
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection middleware error:", err);
    res.status(500).json({
      success: false,
      error: "Database connection failed",
      details: err.message || err.toString()
    });
  }
});

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Map Routes
app.use("/api/maps", mapRoutes);

// Serve landing page at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/home.html"));
});

// Health Check Endpoint with actual DB connection state
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    dbError: getLastError(),
    hasMongoUri: !!process.env.MONGO_URI,
    mongoUriLength: process.env.MONGO_URI ? process.env.MONGO_URI.length : 0,
    timestamp: new Date() 
  });
});

// Error handling middleware (catches Clerk auth errors and general issues)
app.use((err, req, res, next) => {
  console.error("Express Error Handler:", err);

  if (err.name === "UnauthorizedError" || (err.message && err.message.includes("Unauthenticated"))) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid or missing Clerk session token"
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error"
  });
});

module.exports = app;
