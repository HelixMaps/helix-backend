const mongoose = require("mongoose");

const NodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ["idea", "task", "resource"], default: "idea" },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  data: {
    label: { type: String, required: true },
    summary: { type: String, default: "" },
    subMapId: { type: mongoose.Schema.Types.ObjectId, ref: "Map", default: null }
  },
  parentId: { type: String, default: null },
  style: { type: mongoose.Schema.Types.Mixed },
  width: { type: Number },
  height: { type: Number }
});

const EdgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  animated: { type: Boolean, default: true },
  style: {
    stroke: { type: String, default: "#3b82f6" },
    strokeWidth: { type: Number, default: 2 }
  },
  type: { type: String, default: "default" }
});

const MapSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    isPinned: { type: Boolean, default: false },
    parentMapId: { type: mongoose.Schema.Types.ObjectId, ref: "Map", default: null },
    parentNodeId: { type: String, default: null },
    styleConfig: {
      nodeShape: { type: String, enum: ["rounded", "pill", "sharp", "leaf", "asymmetric"], default: "rounded" },
      edgeStyle: { type: String, enum: ["bezier", "straight", "step", "smoothstep"], default: "bezier" }
    },
    nodes: { type: [NodeSchema], default: [] },
    edges: { type: [EdgeSchema], default: [] }
  },
  { timestamps: true }
);

// Text Index for searching maps and nodes text contents
MapSchema.index({
  title: "text",
  "nodes.data.label": "text",
  "nodes.data.summary": "text"
});

module.exports = mongoose.model("Map", MapSchema);
