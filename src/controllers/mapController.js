const mapService = require("../services/mapService");

/**
 * Create a new mind map
 */
const createMap = async (req, res) => {
  try {
    const { title, parentMapId, parentNodeId } = req.body;
    const userId = req.auth.userId;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "title is required"
      });
    }

    const map = await mapService.createMap(userId, title, parentMapId, parentNodeId);
    
    return res.status(201).json({
      success: true,
      data: map
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Fetch details of a single map (including graph nodes/edges)
 */
const fetchMap = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "map ID is required"
      });
    }

    const map = await mapService.fetchMap(userId, id);
    
    return res.status(200).json({
      success: true,
      data: map
    });
  } catch (err) {
    const statusCode = err.message === "Map not found" ? 404 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

/**
 * Fetch all project sessions (with optional filter for pinned/submaps)
 */
const fetchProjects = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { pinned, parentMapId } = req.query;

    const maps = await mapService.fetchProjects(userId, { pinned, parentMapId });
    
    return res.status(200).json({
      success: true,
      data: maps
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Update map config or settings (title, pinned status, connection styles)
 */
const updateMap = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "map ID is required"
      });
    }

    const map = await mapService.updateMap(userId, id, updates);
    
    return res.status(200).json({
      success: true,
      data: map
    });
  } catch (err) {
    const statusCode = err.message.includes("not found") ? 404 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

/**
 * Save nodes and edges layout on the canvas
 */
const saveMapGraph = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;
    const { nodes, edges } = req.body;

    console.log(`[Backend] Saving graph for map ${id}. Nodes: ${nodes?.length || 0}, Edges: ${edges?.length || 0}`);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "map ID is required"
      });
    }

    const map = await mapService.saveMapGraph(userId, id, nodes, edges);
    
    console.log(`[Backend] Graph saved successfully for map ${id}`);
    return res.status(200).json({
      success: true,
      message: "Graph saved successfully",
      data: map
    });
  } catch (err) {
    console.error(`[Backend] Error saving graph for map ${req.params.id}:`, err);
    const statusCode = err.message.includes("not found") ? 404 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

/**
 * Delete a map and its child nested maps
 */
const deleteMap = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "map ID is required"
      });
    }

    await mapService.deleteMap(userId, id);
    
    return res.status(200).json({
      success: true,
      message: "Map and its nested sub-maps deleted successfully"
    });
  } catch (err) {
    const statusCode = err.message.includes("not found") ? 404 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

/**
 * Global text search inside maps and nodes
 */
const searchMapsAndNodes = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "search query parameter 'q' is required"
      });
    }

    const results = await mapService.searchMapsAndNodes(userId, q);
    
    return res.status(200).json({
      success: true,
      results
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  createMap,
  fetchMap,
  fetchProjects,
  updateMap,
  saveMapGraph,
  deleteMap,
  searchMapsAndNodes
};
