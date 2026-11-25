const { clerkClient } = require("@clerk/clerk-sdk-node");
const mapService = require("../services/mapService");

/**
 * Extract caller email from request headers, query, body, or session claims
 */
const extractUserEmail = (req) => {
  const rawHeader = req.headers["x-user-email"];
  if (rawHeader) {
    try {
      return decodeURIComponent(rawHeader).toLowerCase().trim();
    } catch (e) {
      return rawHeader.toLowerCase().trim();
    }
  }
  return (
    req.query.userEmail ||
    req.body?.userEmail ||
    req.auth?.sessionClaims?.email ||
    ""
  ).toLowerCase().trim();
};

/**
 * Extract caller display name from request headers, body, query, or Clerk API
 */
const extractUserName = async (req) => {
  const rawHeader = req.headers["x-user-name"];
  if (rawHeader) {
    try {
      const decoded = decodeURIComponent(rawHeader).trim();
      if (decoded) return decoded;
    } catch (e) {
      if (rawHeader.trim()) return rawHeader.trim();
    }
  }
  if (req.body?.inviterName && req.body.inviterName.trim()) {
    return req.body.inviterName.trim();
  }
  if (req.query?.inviterName && req.query.inviterName.trim()) {
    return req.query.inviterName.trim();
  }

  // Fallback: Check Clerk API using the authenticated caller's userId
  const userId = req.auth?.userId;
  if (userId) {
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim();
      if (fullName) return fullName;
      if (clerkUser?.username) return clerkUser.username;
    } catch (err) {
      // Gracefully continue without throwing if Clerk API is unreachable
    }
  }

  return "";
};

/**
 * Create a new mind map
 */
const createMap = async (req, res) => {
  try {
    const { title, parentMapId, parentNodeId, nodes, edges, styleConfig, ownerEmail } = req.body;
    const userId = req.auth.userId;
    const userEmail = extractUserEmail(req) || ownerEmail;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "title is required"
      });
    }

    const map = await mapService.createMap(
      userId,
      title,
      parentMapId,
      parentNodeId,
      { nodes, edges, styleConfig, ownerEmail },
      userEmail
    );
    
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
    const userEmail = extractUserEmail(req);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "map ID is required"
      });
    }

    const map = await mapService.fetchMap(userId, id, userEmail);
    
    return res.status(200).json({
      success: true,
      data: map
    });
  } catch (err) {
    const statusCode = err.message.includes("not found") ? 404 : 
                       err.message.includes("unauthorized") ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

/**
 * Fetch all project sessions (owned and shared maps)
 */
const fetchProjects = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { pinned, parentMapId, section } = req.query;
    const userEmail = extractUserEmail(req);

    const maps = await mapService.fetchProjects(userId, { pinned, parentMapId, section }, userEmail);
    
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
    const userEmail = extractUserEmail(req);
    const updates = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "map ID is required"
      });
    }

    const map = await mapService.updateMap(userId, id, updates, userEmail);
    
    return res.status(200).json({
      success: true,
      data: map
    });
  } catch (err) {
    const statusCode = err.message.includes("not found") ? 404 :
                       err.message.includes("Unauthorized") ? 403 : 500;
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
    const userEmail = extractUserEmail(req);
    const { nodes, edges } = req.body;

    console.log(`[Backend] Saving graph for map ${id}. Nodes: ${nodes?.length || 0}, Edges: ${edges?.length || 0}`);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "map ID is required"
      });
    }

    const map = await mapService.saveMapGraph(userId, id, nodes, edges, userEmail);
    
    console.log(`[Backend] Graph saved successfully for map ${id}`);
    return res.status(200).json({
      success: true,
      message: "Graph saved successfully",
      data: map
    });
  } catch (err) {
    console.error(`[Backend] Error saving graph for map ${req.params.id}:`, err);
    const statusCode = err.message.includes("not found") ? 404 :
                       err.message.includes("Unauthorized") || err.message.includes("read-only") ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

/**
 * Delete a map and its child nested maps (Owner only)
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
    const statusCode = err.message.includes("not found") ? 404 :
                       err.message.includes("Only the map owner") ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

/**
 * Global text search inside maps and nodes
 */
const searchMapsAndNodes = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const userEmail = extractUserEmail(req);
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "search query parameter 'q' is required"
      });
    }

    const results = await mapService.searchMapsAndNodes(userId, q, userEmail);
    
    return res.status(200).json({
      success: true,
      results
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Fetch a shared map by ID (public access, no auth required)
 */
const fetchSharedMap = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Map ID is required"
      });
    }

    const map = await mapService.fetchSharedMap(id);
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
 * Add a team member to a map project
 */
const addMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, inviterName } = req.body;
    const userId = req.auth.userId;
    const userEmail = extractUserEmail(req);
    const userName = (await extractUserName(req)) || (inviterName || "").trim();

    if (!id) {
      return res.status(400).json({ success: false, message: "Map ID is required" });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required to add team member" });
    }

    const map = await mapService.addMember(userId, id, email, role, userEmail, userName);
    return res.status(200).json({
      success: true,
      message: "Team member added successfully",
      data: map
    });
  } catch (err) {
    const statusCode = err.message.includes("not found") ? 404 :
                       err.message.includes("Only the map owner") ? 403 :
                       err.message.includes("already") || err.message.includes("Cannot add") || err.message.includes("format") ? 400 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

/**
 * Remove a team member from a map project
 */
const removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.auth.userId;
    const userEmail = extractUserEmail(req);

    if (!id || !memberId) {
      return res.status(400).json({ success: false, message: "Map ID and member identifier are required" });
    }

    const map = await mapService.removeMember(userId, id, memberId, userEmail);
    return res.status(200).json({
      success: true,
      message: "Team member removed successfully",
      data: map
    });
  } catch (err) {
    const statusCode = err.message.includes("not found") ? 404 :
                       err.message.includes("Only the map owner") ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

/**
 * Update a team member's role (editor vs viewer)
 */
const updateMemberRole = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;
    const userId = req.auth.userId;

    if (!id || !memberId) {
      return res.status(400).json({ success: false, message: "Map ID and member identifier are required" });
    }
    if (!role) {
      return res.status(400).json({ success: false, message: "Role is required" });
    }

    const map = await mapService.updateMemberRole(userId, id, memberId, role);
    return res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      data: map
    });
  } catch (err) {
    const statusCode = err.message.includes("not found") ? 404 :
                       err.message.includes("Only the map owner") ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

/**
 * Get all members and owner of a map
 */
const getMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;
    const userEmail = extractUserEmail(req);

    const map = await mapService.fetchMap(userId, id, userEmail);
    return res.status(200).json({
      success: true,
      data: {
        owner: {
          userId: map.userId,
          email: map.ownerEmail || ""
        },
        members: map.members || [],
        isOwner: map.isOwner,
        userRole: map.userRole
      }
    });
  } catch (err) {
    const statusCode = err.message.includes("not found") ? 404 :
                       err.message.includes("unauthorized") ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

module.exports = {
  createMap,
  fetchMap,
  fetchSharedMap,
  fetchProjects,
  updateMap,
  saveMapGraph,
  deleteMap,
  searchMapsAndNodes,
  addMember,
  removeMember,
  updateMemberRole,
  getMembers
};
