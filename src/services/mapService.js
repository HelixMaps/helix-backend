const Map = require("../models/mapModel");

/**
 * Create a new mind map
 */
const createMap = async (userId, title, parentMapId = null, parentNodeId = null) => {
  // Create map document
  const newMap = new Map({
    userId,
    title,
    parentMapId: parentMapId || null,
    parentNodeId: parentNodeId || null,
    nodes: [
      {
        id: `root-${Date.now()}`,
        type: "idea",
        position: { x: 250, y: 150 },
        data: { label: title || "Central Idea", summary: "", subMapId: null }
      }
    ],
    edges: []
  });

  const savedMap = await newMap.save();

  // If this is a nested sub-map, link it to the parent node in the parent map
  if (parentMapId && parentNodeId) {
    await Map.updateOne(
      { _id: parentMapId, userId, "nodes.id": parentNodeId },
      { $set: { "nodes.$.data.subMapId": savedMap._id } }
    );
  }

  return savedMap;
};

/**
 * Fetch a single map by ID
 */
const fetchMap = async (userId, id) => {
  const map = await Map.findOne({ _id: id, userId });
  if (!map) {
    throw new Error("Map not found");
  }
  return map;
};

/**
 * Fetch all projects (maps) with filters
 */
const fetchProjects = async (userId, filters = {}) => {
  const query = { userId };

  if (filters.pinned !== undefined) {
    query.isPinned = filters.pinned === "true" || filters.pinned === true;
  }

  if (filters.parentMapId !== undefined) {
    query.parentMapId = filters.parentMapId === "null" ? null : filters.parentMapId;
  }

  // Sort by latest updated
  return await Map.find(query).sort({ updatedAt: -1 });
};

/**
 * Update map metadata (title, pinned status, styles)
 */
const updateMap = async (userId, id, updates) => {
  const allowedUpdates = ["title", "isPinned", "styleConfig"];
  const updateQuery = {};

  Object.keys(updates).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      updateQuery[key] = updates[key];
    }
  });

  const updatedMap = await Map.findOneAndUpdate(
    { _id: id, userId },
    { $set: updateQuery },
    { new: true, runValidators: true }
  );

  if (!updatedMap) {
    throw new Error("Map not found or unauthorized");
  }

  return updatedMap;
};

/**
 * Save nodes and edges layout
 */
const saveMapGraph = async (userId, id, nodes, edges) => {
  // Strip transient frontend editing states if any
  const sanitizedNodes = (nodes || []).map((node) => ({
    ...node,
    data: {
      ...node.data,
      isEditing: false
    }
  }));

  const updatedMap = await Map.findOneAndUpdate(
    { _id: id, userId },
    { $set: { nodes: sanitizedNodes, edges: edges || [] } },
    { new: true }
  );

  if (!updatedMap) {
    throw new Error("Map not found or unauthorized");
  }

  return updatedMap;
};

/**
 * Delete a map and recursively cascade deletes for all sub-maps
 */
const deleteMap = async (userId, id) => {
  const mapToDelete = await Map.findOne({ _id: id, userId });
  if (!mapToDelete) {
    throw new Error("Map not found or unauthorized");
  }

  // 1. If it's a submap, clear parent node link
  if (mapToDelete.parentMapId && mapToDelete.parentNodeId) {
    await Map.updateOne(
      { _id: mapToDelete.parentMapId, userId, "nodes.id": mapToDelete.parentNodeId },
      { $set: { "nodes.$.data.subMapId": null } }
    );
  }

  // 2. Recursive cascading deletion
  const deleteCascade = async (targetMapId) => {
    const children = await Map.find({ userId, parentMapId: targetMapId });
    for (const child of children) {
      await deleteCascade(child._id);
    }
    await Map.deleteOne({ _id: targetMapId, userId });
  };

  await deleteCascade(id);
  return true;
};

/**
 * Global text search inside maps and nodes
 */
const searchMapsAndNodes = async (userId, searchText) => {
  if (!searchText) return [];

  // Mongo Text Search
  const matchedMaps = await Map.find(
    { userId, $text: { $search: searchText } },
    { score: { $meta: "textScore" } }
  ).sort({ score: { $meta: "textScore" } });

  const results = [];

  matchedMaps.forEach((map) => {
    const titleRegex = new RegExp(searchText, "i");

    // 1. Add map title match
    if (titleRegex.test(map.title)) {
      results.push({
        mapId: map._id,
        mapTitle: map.title,
        matchType: "map",
        details: "Map Title Match"
      });
    }

    // 2. Add individual node matches
    (map.nodes || []).forEach((node) => {
      const labelMatch = node.data?.label && titleRegex.test(node.data.label);
      const summaryMatch = node.data?.summary && titleRegex.test(node.data.summary);

      if (labelMatch || summaryMatch) {
        results.push({
          mapId: map._id,
          mapTitle: map.title,
          matchType: "node",
          matchedNode: {
            id: node.id,
            type: node.type,
            label: node.data.label,
            summary: node.data.summary
          },
          details: labelMatch ? "Node Title Match" : "Node Notes Match"
        });
      }
    });
  });

  return results;
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
