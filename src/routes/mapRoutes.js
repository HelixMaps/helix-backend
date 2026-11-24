const express = require("express");
const router = express.Router();
const mapController = require("../controllers/mapController");
const { requireAuth } = require("../middleware/auth");

// Public Shared Map endpoint (no auth required)
router.get("/shared/:id", mapController.fetchSharedMap);

// All map endpoints below require a valid Clerk session token
router.use(requireAuth);

// Map and Graph Routes
router.post("/", mapController.createMap);
router.get("/", mapController.fetchProjects);
router.get("/search", mapController.searchMapsAndNodes);
router.get("/:id", mapController.fetchMap);
router.patch("/:id", mapController.updateMap);
router.put("/:id/graph", mapController.saveMapGraph);
router.delete("/:id", mapController.deleteMap);

// Team Members Management Routes
router.get("/:id/members", mapController.getMembers);
router.post("/:id/members", mapController.addMember);
router.delete("/:id/members/:memberId", mapController.removeMember);
router.patch("/:id/members/:memberId", mapController.updateMemberRole);

module.exports = router;
