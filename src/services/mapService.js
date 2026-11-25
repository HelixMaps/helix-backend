const Map = require("../models/mapModel");
const emailService = require("./emailService");

/**
 * Create a new mind map
 */
const createMap = async (userId, title, parentMapId = null, parentNodeId = null, initialData = {}, userEmail = "") => {
  const defaultNodes = [
    {
      id: `root-${Date.now()}`,
      type: "idea",
      position: { x: 250, y: 150 },
      data: { label: title || "Central Idea", summary: "", subMapId: null }
    }
  ];

  const sanitizedNodes = (initialData.nodes && initialData.nodes.length > 0)
    ? initialData.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isEditing: false,
          elevation: node.data?.elevation || 60
        }
      }))
    : defaultNodes;

  const normalizedOwnerEmail = (userEmail || initialData.ownerEmail || "").toLowerCase().trim();

  // Create map document
  const newMap = new Map({
    userId,
    ownerEmail: normalizedOwnerEmail,
    title,
    parentMapId: parentMapId || null,
    parentNodeId: parentNodeId || null,
    nodes: sanitizedNodes,
    edges: initialData.edges || [],
    styleConfig: initialData.styleConfig || { nodeShape: "rounded", edgeStyle: "smoothstep" },
    members: initialData.members || []
  });

  const savedMap = await newMap.save();

  // If this is a nested sub-map, link it to the parent node in the parent map
  if (parentMapId && parentNodeId) {
    await Map.updateOne(
      { _id: parentMapId, userId, "nodes.id": parentNodeId },
      { $set: { "nodes.$.data.subMapId": savedMap._id } }
    );
  }

  const mapObj = savedMap.toObject();
  mapObj.isOwner = true;
  mapObj.userRole = "owner";
  return mapObj;
};

/**
 * Fetch a single map by ID (authorized for owner or invited member)
 */
const fetchMap = async (userId, id, userEmail = "") => {
  const map = await Map.findById(id);
  if (!map) {
    throw new Error("Map not found");
  }

  const isOwner = map.userId === userId;
  const normalizedEmail = (userEmail || "").toLowerCase().trim();
  const matchingMember = normalizedEmail
    ? map.members.find((m) => m.email && m.email.toLowerCase() === normalizedEmail)
    : null;

  if (!isOwner && !matchingMember) {
    throw new Error("Map not found or unauthorized");
  }

  // Backfill owner email if missing
  if (isOwner && !map.ownerEmail && normalizedEmail) {
    map.ownerEmail = normalizedEmail;
    await Map.updateOne({ _id: map._id }, { $set: { ownerEmail: normalizedEmail } });
  }

  const mapObj = map.toObject();
  mapObj.isOwner = isOwner;
  mapObj.userRole = isOwner ? "owner" : (matchingMember ? matchingMember.role : "viewer");
  return mapObj;
};

/**
 * Fetch all projects (maps) with filters (owned maps and shared maps)
 */
const fetchProjects = async (userId, filters = {}, userEmail = "") => {
  const normalizedEmail = (userEmail || "").toLowerCase().trim();

  // 1. Fetch Owned Maps
  const ownedQuery = { userId };
  if (filters.pinned !== undefined) {
    ownedQuery.isPinned = filters.pinned === "true" || filters.pinned === true;
  }
  if (filters.parentMapId !== undefined) {
    ownedQuery.parentMapId = filters.parentMapId === "null" ? null : filters.parentMapId;
  }

  const ownedMaps = await Map.find(ownedQuery).sort({ updatedAt: -1 });
  const formattedOwned = ownedMaps.map((m) => {
    const obj = m.toObject();
    obj.isOwner = true;
    obj.userRole = "owner";
    return obj;
  });

  // Asynchronously backfill owner email on owned maps if missing
  if (normalizedEmail && ownedMaps.some((m) => !m.ownerEmail)) {
    Map.updateMany(
      { userId, $or: [{ ownerEmail: "" }, { ownerEmail: { $exists: false } }] },
      { $set: { ownerEmail: normalizedEmail } }
    ).exec().catch(() => {});
  }

  // 2. Fetch Shared Maps (maps where user's email is in members, but user is NOT the owner)
  let formattedShared = [];
  if (normalizedEmail) {
    const sharedQuery = {
      userId: { $ne: userId },
      "members.email": normalizedEmail
    };

    if (filters.parentMapId !== undefined) {
      sharedQuery.parentMapId = filters.parentMapId === "null" ? null : filters.parentMapId;
    }

    const sharedMaps = await Map.find(sharedQuery).sort({ updatedAt: -1 });
    formattedShared = sharedMaps.map((m) => {
      const obj = m.toObject();
      const member = obj.members?.find((mem) => mem.email && mem.email.toLowerCase() === normalizedEmail);
      obj.isOwner = false;
      obj.userRole = member?.role || "editor";
      return obj;
    });
  }

  // Support section filter if explicitly requested
  if (filters.section === "shared") {
    return formattedShared;
  }
  if (filters.section === "owned") {
    return formattedOwned;
  }

  // Combine owned and shared maps (owned first, then shared)
  return [...formattedOwned, ...formattedShared];
};

/**
 * Add a team member to a map project by email
 */
const addMember = async (userId, mapId, email, role = "editor", userEmail = "") => {
  if (!email || typeof email !== "string") {
    throw new Error("A valid email address is required");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizedEmail = email.toLowerCase().trim();
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error("Invalid email address format");
  }

  const map = await Map.findById(mapId);
  if (!map) {
    throw new Error("Map not found");
  }

  // Only the owner can add members
  if (map.userId !== userId) {
    throw new Error("Only the map owner can invite team members");
  }

  // Backfill owner email if missing
  if (!map.ownerEmail && userEmail) {
    map.ownerEmail = userEmail.toLowerCase().trim();
  }

  // Disallow adding owner as a member
  if (map.ownerEmail && map.ownerEmail.toLowerCase() === normalizedEmail) {
    throw new Error("Cannot add the map owner as a team member");
  }

  // Check duplicate member
  const alreadyMember = map.members.some((m) => m.email && m.email.toLowerCase() === normalizedEmail);
  if (alreadyMember) {
    throw new Error("This user is already a member of this mind map");
  }

  const memberRole = role === "viewer" ? "viewer" : "editor";
  map.members.push({
    email: normalizedEmail,
    role: memberRole,
    addedAt: new Date(),
    addedBy: userId
  });

  await map.save();

  // Send invitation email notification asynchronously
  emailService
    .sendMapInviteEmail({
      toEmail: normalizedEmail,
      inviterEmail: map.ownerEmail || userEmail,
      mapTitle: map.title,
      mapId: map._id.toString(),
      role: memberRole,
    })
    .catch((err) => {
      console.error("[mapService] Error dispatching map invitation email:", err?.message || err);
    });

  const mapObj = map.toObject();
  mapObj.isOwner = true;
  mapObj.userRole = "owner";
  return mapObj;
};

/**
 * Remove a team member from a map project
 */
const removeMember = async (userId, mapId, memberEmailOrId, userEmail = "") => {
  const map = await Map.findById(mapId);
  if (!map) {
    throw new Error("Map not found");
  }

  const isOwner = map.userId === userId;
  const normalizedUserEmail = (userEmail || "").toLowerCase().trim();
  const normalizedTarget = (memberEmailOrId || "").toLowerCase().trim();

  // Allow owner to remove anyone, or a member to remove themselves (leave map)
  const isSelfLeaving = normalizedUserEmail && (
    normalizedTarget === normalizedUserEmail ||
    map.members.some((m) => m._id.toString() === memberEmailOrId && m.email.toLowerCase() === normalizedUserEmail)
  );

  if (!isOwner && !isSelfLeaving) {
    throw new Error("Only the map owner can remove team members");
  }

  const initialCount = map.members.length;
  map.members = map.members.filter(
    (m) => m.email.toLowerCase() !== normalizedTarget && m._id.toString() !== memberEmailOrId
  );

  if (map.members.length === initialCount) {
    throw new Error("Member not found in map");
  }

  await map.save();

  const mapObj = map.toObject();
  mapObj.isOwner = isOwner;
  mapObj.userRole = isOwner ? "owner" : "member";
  return mapObj;
};

/**
 * Update a team member's role (editor vs viewer)
 */
const updateMemberRole = async (userId, mapId, memberEmailOrId, newRole) => {
  const map = await Map.findById(mapId);
  if (!map) {
    throw new Error("Map not found");
  }

  if (map.userId !== userId) {
    throw new Error("Only the map owner can update team member roles");
  }

  const normalizedTarget = (memberEmailOrId || "").toLowerCase().trim();
  const member = map.members.find(
    (m) => m.email.toLowerCase() === normalizedTarget || m._id.toString() === memberEmailOrId
  );

  if (!member) {
    throw new Error("Member not found in map");
  }

  member.role = newRole === "viewer" ? "viewer" : "editor";
  await map.save();

  const mapObj = map.toObject();
  mapObj.isOwner = true;
  mapObj.userRole = "owner";
  return mapObj;
};

/**
 * Update map metadata (title, pinned status, styles)
 */
const updateMap = async (userId, id, updates, userEmail = "") => {
  const map = await Map.findById(id);
  if (!map) {
    throw new Error("Map not found");
  }

  const isOwner = map.userId === userId;
  const normalizedEmail = (userEmail || "").toLowerCase().trim();
  const member = normalizedEmail
    ? map.members.find((m) => m.email && m.email.toLowerCase() === normalizedEmail)
    : null;

  if (!isOwner && (!member || member.role !== "editor")) {
    throw new Error("Unauthorized to update map settings");
  }

  const updateSet = {};
  if (updates.title !== undefined) {
    updateSet.title = updates.title;
  }
  if (updates.isPinned !== undefined && isOwner) {
    updateSet.isPinned = updates.isPinned;
  }
  if (updates.styleConfig !== undefined) {
    updateSet.styleConfig = updates.styleConfig;
  }
  if (updates.ownerEmail && isOwner && !map.ownerEmail) {
    updateSet.ownerEmail = updates.ownerEmail.toLowerCase().trim();
  }

  const updatedMap = await Map.findByIdAndUpdate(
    id,
    { $set: updateSet },
    { returnDocument: "after" }
  );

  const mapObj = updatedMap.toObject();
  mapObj.isOwner = isOwner;
  mapObj.userRole = isOwner ? "owner" : (member?.role || "viewer");
  return mapObj;
};

/**
 * Save nodes and edges layout
 */
const saveMapGraph = async (userId, id, nodes, edges, userEmail = "") => {
  const map = await Map.findById(id);
  if (!map) {
    throw new Error("Map not found");
  }

  const isOwner = map.userId === userId;
  const normalizedEmail = (userEmail || "").toLowerCase().trim();
  const member = normalizedEmail
    ? map.members.find((m) => m.email && m.email.toLowerCase() === normalizedEmail)
    : null;

  if (!isOwner && !member) {
    throw new Error("Map not found or unauthorized");
  }

  if (member && member.role === "viewer") {
    throw new Error("Viewers have read-only permissions and cannot modify the map canvas");
  }

  // Strip transient frontend editing states if any
  const sanitizedNodes = (nodes || []).map((node) => ({
    ...node,
    data: {
      ...node.data,
      isEditing: false
    }
  }));

  const updatedMap = await Map.findByIdAndUpdate(
    id,
    { $set: { nodes: sanitizedNodes, edges: edges || [] } },
    { returnDocument: "after" }
  );

  const mapObj = updatedMap.toObject();
  mapObj.isOwner = isOwner;
  mapObj.userRole = isOwner ? "owner" : (member?.role || "editor");
  return mapObj;
};

/**
 * Delete a map and recursively cascade deletes for all sub-maps (Owner only)
 */
const deleteMap = async (userId, id) => {
  const mapToDelete = await Map.findById(id);
  if (!mapToDelete) {
    throw new Error("Map not found or unauthorized");
  }

  // Strictly enforce: Only the owner can delete a map
  if (mapToDelete.userId !== userId) {
    throw new Error("Only the map owner has permission to delete this mind map");
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
const searchMapsAndNodes = async (userId, searchText, userEmail = "") => {
  if (!searchText) return [];

  const normalizedEmail = (userEmail || "").toLowerCase().trim();
  const accessFilter = normalizedEmail
    ? { $or: [{ userId }, { "members.email": normalizedEmail }] }
    : { userId };

  // Mongo Text Search
  const matchedMaps = await Map.find(
    { ...accessFilter, $text: { $search: searchText } },
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
        details: "Map Title Match",
        isOwner: map.userId === userId
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
          details: labelMatch ? "Node Title Match" : "Node Notes Match",
          isOwner: map.userId === userId
        });
      }
    });
  });

  return results;
};

/**
 * Fetch a shared map by ID (public access)
 */
const fetchSharedMap = async (id) => {
  const map = await Map.findById(id);
  if (!map) {
    throw new Error("Map not found");
  }
  return map;
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
  updateMemberRole
};
