const express = require("express");
const router = express.Router();
const mapController = require("../controllers/mapController");
const { requireAuth } = require("../middleware/auth");

// All map endpoints require a valid Clerk session token
router.use(requireAuth);

// Map and Graph Routes
router.post("/", mapController.createMap);
router.get("/", mapController.fetchProjects);
router.get("/search", mapController.searchMapsAndNodes);
router.get("/:id", mapController.fetchMap);
router.patch("/:id", mapController.updateMap);
router.put("/:id/graph", mapController.saveMapGraph);
router.delete("/:id", mapController.deleteMap);

module.exports = router;
