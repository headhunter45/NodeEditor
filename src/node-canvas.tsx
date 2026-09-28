import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Trash2,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Play,
} from "lucide-react";
import type {
  GraphNode,
  GraphConnection,
  NodeSocket,
  SocketDataType,
  NodeDefinition,
} from "./types";
import { GraphNodeCard, getSocketColor } from "./graph-node";
import { NodePaletteModal } from "./node-palette-modal";
import { createGraphNodeFromDefinition } from "./node-definitions";
import {
  evaluateNodeGraph,
  EvaluationContext,
} from "./expression-evaluator";

interface NodeCanvasProps {
  initialNodes?: GraphNode[];
  initialConnections?: GraphConnection[];
  variables?: Record<string, boolean | number | string>;
  flags?: Record<string, boolean>;
  inventory?: string[];
  visitedScenes?: string[];
  currentScene?: string;
  onGraphChange?: (nodes: GraphNode[], connections: GraphConnection[]) => void;
  onApplyCriteria?: (criteriaPassed: boolean) => void;
}

// Built-in starter presets
const PRESET_HEALTH_SCORE_GATE: { nodes: GraphNode[]; connections: GraphConnection[] } = {
  nodes: [
    {
      id: "node-var-score",
      type: "var_get",
      title: "Get Variable",
      category: "variable",
      subtitle: "Episode Variable",
      x: 100,
      y: 120,
      inputs: [],
      outputs: [{ id: "val", name: "Value", type: "number", direction: "output" }],
      properties: {
        varName: { id: "varName", label: "Variable Name", type: "variable-select", value: "playerScore" },
      },
    },
    {
      id: "node-lit-score-target",
      type: "literal_number",
      title: "Score Threshold",
      category: "variable",
      subtitle: "Number Constant",
      x: 100,
      y: 280,
      inputs: [],
      outputs: [{ id: "val", name: "Value", type: "number", direction: "output" }],
      properties: {
        value: { id: "value", label: "Value", type: "number", value: 50 },
      },
    },
    {
      id: "node-comp-score",
      type: "comp_gte",
      title: "Score >= 50",
      category: "comparison",
      subtitle: "Greater / Equal",
      x: 420,
      y: 180,
      inputs: [
        { id: "a", name: "A", type: "number", direction: "input", defaultValue: 0 },
        { id: "b", name: "B", type: "number", direction: "input", defaultValue: 50 },
      ],
      outputs: [{ id: "out", name: "Result", type: "boolean", direction: "output" }],
    },
    {
      id: "node-flag-clue",
      type: "state_has_flag",
      title: "Has Clue Flag",
      category: "state",
      subtitle: "Flag Check",
      x: 420,
      y: 360,
      inputs: [],
      outputs: [{ id: "out", name: "Has Flag", type: "boolean", direction: "output" }],
      properties: {
        flagName: { id: "flagName", label: "Flag Name", type: "text", value: "found_secret_clue" },
      },
    },
    {
      id: "node-and-gate",
      type: "logic_and",
      title: "And",
      category: "logic",
      subtitle: "Both Conditions",
      x: 740,
      y: 240,
      inputs: [
        { id: "a", name: "Condition A", type: "boolean", direction: "input", defaultValue: true },
        { id: "b", name: "Condition B", type: "boolean", direction: "input", defaultValue: true },
      ],
      outputs: [{ id: "out", name: "Result", type: "boolean", direction: "output" }],
    },
    {
      id: "node-sink-action",
      type: "action_condition",
      title: "Action Condition Criteria",
      category: "action",
      subtitle: "Criteria Sink",
      x: 1060,
      y: 240,
      inputs: [
        { id: "condition", name: "Execute Condition", type: "boolean", direction: "input", defaultValue: true },
      ],
      outputs: [{ id: "flow", name: "Passed", type: "flow", direction: "output" }],
      properties: {
        targetAction: { id: "targetAction", label: "Target Cue", type: "text", value: "Unlock Secret Door" },
      },
    },
  ],
  connections: [
    { id: "c1", fromNodeId: "node-var-score", fromSocketId: "val", toNodeId: "node-comp-score", toSocketId: "a" },
    { id: "c2", fromNodeId: "node-lit-score-target", fromSocketId: "val", toNodeId: "node-comp-score", toSocketId: "b" },
    { id: "c3", fromNodeId: "node-comp-score", fromSocketId: "out", toNodeId: "node-and-gate", toSocketId: "a" },
    { id: "c4", fromNodeId: "node-flag-clue", fromSocketId: "out", toNodeId: "node-and-gate", toSocketId: "b" },
    { id: "c5", fromNodeId: "node-and-gate", fromSocketId: "out", toNodeId: "node-sink-action", toSocketId: "condition" },
  ],
};

export const NodeCanvas: React.FC<NodeCanvasProps> = ({
  initialNodes,
  initialConnections,
  variables = { playerScore: 65, playerHealth: 100, difficulty: "normal" },
  flags = { found_secret_clue: true, met_alchemist: false },
  inventory = ["Bronze Key", "Old Journal"],
  visitedScenes = ["Courtyard", "Library"],
  currentScene = "Library",
  onGraphChange,
  onApplyCriteria,
}) => {
  const [nodes, setNodes] = useState<GraphNode[]>(
    initialNodes && initialNodes.length > 0
      ? initialNodes
      : PRESET_HEALTH_SCORE_GATE.nodes
  );
  const [connections, setConnections] = useState<GraphConnection[]>(
    initialConnections && initialConnections.length > 0
      ? initialConnections
      : PRESET_HEALTH_SCORE_GATE.connections
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Pan & Zoom
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 60, y: 80 });
  const [zoom, setZoom] = useState<number>(1);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Node Dragging
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; nodeX: number; nodeY: number }>({
    x: 0,
    y: 0,
    nodeX: 0,
    nodeY: 0,
  });

  // Socket Connection Dragging
  const [activeDraft, setActiveDraft] = useState<{
    fromNodeId: string;
    fromSocketId: string;
    direction: "input" | "output";
    socketType: SocketDataType;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Palette Modal
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteSpawnPos, setPaletteSpawnPos] = useState<{ x: number; y: number }>({
    x: 400,
    y: 300,
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Evaluation Context
  const evaluationContext: EvaluationContext = useMemo(
    () => ({
      variables,
      flags,
      inventory,
      visitedScenes,
      currentScene,
    }),
    [variables, flags, inventory, visitedScenes, currentScene]
  );

  // Evaluate Expression Graph in real-time
  const evalResult = useMemo(() => {
    return evaluateNodeGraph(nodes, connections, evaluationContext);
  }, [nodes, connections, evaluationContext]);

  // Update node evaluated values
  const evaluatedNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      evaluatedValue: evalResult.nodeValues[node.id],
    }));
  }, [nodes, evalResult]);

  // Notify parent on change
  useEffect(() => {
    onGraphChange?.(nodes, connections);
  }, [nodes, connections, onGraphChange]);

  // Transform screen coordinate to canvas coordinate
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      if (!canvasRef.current) return { x: screenX, y: screenY };
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: (screenX - rect.left - pan.x) / zoom,
        y: (screenY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Wheel zoom and pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.3), 2.5);

      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Zoom centered on cursor
        setPan((prevPan) => ({
          x: mouseX - ((mouseX - prevPan.x) * newZoom) / zoom,
          y: mouseY - ((mouseY - prevPan.y) * newZoom) / zoom,
        }));
      }
      setZoom(newZoom);
    } else {
      // Pan
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Canvas Mouse Down
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If middle click or space bar or clicking canvas background
    if (e.button === 1 || (e.button === 0 && e.target === canvasRef.current)) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setSelectedNodeId(null);
    }
  };

  // Window/Canvas Mouse Move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
      } else if (draggingNodeId) {
        const dx = (e.clientX - dragStartRef.current.x) / zoom;
        const dy = (e.clientY - dragStartRef.current.y) / zoom;
        setNodes((prev) =>
          prev.map((n) =>
            n.id === draggingNodeId
              ? {
                  ...n,
                  x: Math.round((dragStartRef.current.nodeX + dx) / 10) * 10,
                  y: Math.round((dragStartRef.current.nodeY + dy) / 10) * 10,
                }
              : n
          )
        );
      } else if (activeDraft) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setActiveDraft((prev) =>
          prev
            ? {
                ...prev,
                currentX: canvasPos.x,
                currentY: canvasPos.y,
              }
            : null
        );
      }
    },
    [isPanning, draggingNodeId, activeDraft, zoom, screenToCanvas]
  );

  // Mouse Up
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNodeId(null);
    if (activeDraft) {
      setActiveDraft(null);
    }
  }, [activeDraft]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Global keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift + A opens add node palette
      if (e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setPaletteSpawnPos({ x: 300, y: 200 });
        setIsPaletteOpen(true);
      }
      // Delete or Backspace removes selected node
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedNodeId &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)
      ) {
        handleDeleteNode(selectedNodeId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId]);

  // Node operations
  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) =>
      prev.filter((c) => c.fromNodeId !== id && c.toNodeId !== id)
    );
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const handleSelectNode = (node: GraphNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };
  };

  // Add node from palette
  const handleAddNodeFromDef = (def: NodeDefinition) => {
    const canvasPos = screenToCanvas(
      paletteSpawnPos.x,
      paletteSpawnPos.y
    );
    const newNode = createGraphNodeFromDefinition(def, canvasPos.x, canvasPos.y);
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  // Socket mouse down -> start wire draft
  const handleSocketMouseDown = (
    e: React.MouseEvent,
    node: GraphNode,
    socket: NodeSocket,
    direction: "input" | "output"
  ) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    const startX = (rect.left + rect.width / 2 - canvasRect.left - pan.x) / zoom;
    const startY = (rect.top + rect.height / 2 - canvasRect.top - pan.y) / zoom;

    setActiveDraft({
      fromNodeId: node.id,
      fromSocketId: socket.id,
      direction,
      socketType: socket.type,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
    });
  };

  // Socket mouse up -> complete wire connection
  const handleSocketMouseUp = (
    e: React.MouseEvent,
    targetNode: GraphNode,
    targetSocket: NodeSocket,
    targetDirection: "input" | "output"
  ) => {
    e.stopPropagation();
    if (!activeDraft) return;

    // Validate connection rules:
    // 1. One must be output, one must be input
    // 2. Cannot connect node to itself
    if (activeDraft.fromNodeId === targetNode.id) {
      setActiveDraft(null);
      return;
    }

    let sourceNodeId: string;
    let sourceSocketId: string;
    let destNodeId: string;
    let destSocketId: string;
    let sourceType: SocketDataType;
    let destType: SocketDataType;

    if (activeDraft.direction === "output" && targetDirection === "input") {
      sourceNodeId = activeDraft.fromNodeId;
      sourceSocketId = activeDraft.fromSocketId;
      sourceType = activeDraft.socketType;
      destNodeId = targetNode.id;
      destSocketId = targetSocket.id;
      destType = targetSocket.type;
    } else if (activeDraft.direction === "input" && targetDirection === "output") {
      sourceNodeId = targetNode.id;
      sourceSocketId = targetSocket.id;
      sourceType = targetSocket.type;
      destNodeId = activeDraft.fromNodeId;
      destSocketId = activeDraft.fromSocketId;
      destType = activeDraft.socketType;
    } else {
      setActiveDraft(null);
      return;
    }

    // Check type compatibility (flow with flow, data with compatible data)
    if (sourceType === "flow" || destType === "flow") {
      if (sourceType !== destType) {
        setActiveDraft(null);
        return;
      }
    }

    // Remove any existing connection into the destination input socket (inputs have single incoming wire)
    setConnections((prev) => {
      const filtered = prev.filter(
        (c) => !(c.toNodeId === destNodeId && c.toSocketId === destSocketId)
      );
      const newConn: GraphConnection = {
        id: `conn-${sourceNodeId}-${sourceSocketId}-${destNodeId}-${destSocketId}-${Date.now().toString(36)}`,
        fromNodeId: sourceNodeId,
        fromSocketId: sourceSocketId,
        toNodeId: destNodeId,
        toSocketId: destSocketId,
      };
      return [...filtered, newConn];
    });

    setActiveDraft(null);
  };

  // Update socket inline value fallback
  const handleUpdateSocketValue = (
    nodeId: string,
    socketId: string,
    val: boolean | number | string
  ) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          inputs: n.inputs.map((inp) =>
            inp.id === socketId ? { ...inp, value: val } : inp
          ),
        };
      })
    );
  };

  // Update node property
  const handleUpdateProperty = (
    nodeId: string,
    propId: string,
    val: boolean | number | string
  ) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId || !n.properties || !n.properties[propId]) return n;
        return {
          ...n,
          properties: {
            ...n.properties,
            [propId]: {
              ...n.properties[propId],
              value: val,
            },
          },
        };
      })
    );
  };

  // Delete a specific connection
  const handleDeleteConnection = (connId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== connId));
  };

  // Get coordinates for socket port in canvas coordinate space
  const getSocketCoordinates = (
    nodeId: string,
    socketId: string,
    direction: "input" | "output"
  ): { x: number; y: number } | null => {
    if (!canvasRef.current) return null;
    const el = canvasRef.current.querySelector(
      `[data-node-id="${nodeId}"][data-socket-id="${socketId}"][data-direction="${direction}"]`
    );
    if (!el) {
      // Fallback estimate
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return null;
      const x = direction === "input" ? node.x : node.x + 256;
      const y = node.y + 70;
      return { x, y };
    }
    const rect = el.getBoundingClientRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    return {
      x: (rect.left + rect.width / 2 - canvasRect.left - pan.x) / zoom,
      y: (rect.top + rect.height / 2 - canvasRect.top - pan.y) / zoom,
    };
  };

  // Generate cubic bezier curve path
  const makeBezierPath = (
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): string => {
    const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  // Variables list for dropdowns
  const variableOptions = Object.entries(variables).map(([name, val]) => ({
    name,
    type: typeof val,
  }));

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none flex flex-col font-sans">
      {/* Top Floating Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Left Action Buttons */}
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-xl pointer-events-auto">
          <button
            onClick={() => {
              setPaletteSpawnPos({ x: 350, y: 200 });
              setIsPaletteOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg text-xs transition-colors shadow"
          >
            <Plus className="w-4 h-4" />
            Add Node
          </button>

          <div className="h-4 w-[1px] bg-slate-700 mx-1" />

          {/* Preset Selector */}
          <button
            onClick={() => {
              setNodes(PRESET_HEALTH_SCORE_GATE.nodes);
              setConnections(PRESET_HEALTH_SCORE_GATE.connections);
              setPan({ x: 60, y: 80 });
              setZoom(1);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors border border-slate-700"
            title="Load Health & Score Gate Preset"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            Preset: Score & Flag Gate
          </button>

          <button
            onClick={() => {
              setNodes([]);
              setConnections([]);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded-lg text-xs transition-colors"
            title="Clear all nodes"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>

        {/* Live Evaluation Status HUD */}
        <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/80 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Expression Status:</span>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${
                evalResult.finalCriteriaPassed
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/40"
              }`}
            >
              {evalResult.finalCriteriaPassed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  CRITERIA PASSED
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  CRITERIA BLOCKED
                </>
              )}
            </div>
          </div>

          {onApplyCriteria && (
            <button
              onClick={() => onApplyCriteria(evalResult.finalCriteriaPassed)}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium transition-colors"
            >
              <Play className="w-3 h-3" />
              Apply to Action
            </button>
          )}
        </div>

        {/* Right Zoom & View Controls */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-xl pointer-events-auto text-slate-300">
          <button
            onClick={() => setZoom((z) => Math.min(z * 1.15, 2.5))}
            className="p-1.5 rounded hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono px-1 min-w-[36px] text-center text-slate-400">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(z * 0.85, 0.3))}
            className="p-1.5 rounded hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 60, y: 80 });
            }}
            className="p-1.5 rounded hover:bg-slate-800 transition-colors"
            title="Reset Pan & Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Pan/Zoom Canvas Surface */}
      <div
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onContextMenu={(e) => {
          e.preventDefault();
          setPaletteSpawnPos({ x: e.clientX, y: e.clientY });
          setIsPaletteOpen(true);
        }}
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden"
        style={{
          backgroundColor: "#060913",
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.08) 1.5px, transparent 0),
            radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.03) 1px, transparent 0)
          `,
          backgroundSize: `${32 * zoom}px ${32 * zoom}px, ${8 * zoom}px ${8 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px, ${pan.x}px ${pan.y}px`,
        }}
      >
        {/* World Container (Pan & Zoom Transformed) */}
        <div
          className="absolute inset-0 pointer-events-none origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG Connections Layer */}
          <svg className="absolute inset-0 w-[8000px] h-[8000px] overflow-visible pointer-events-none">
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Render Active and Inactive Connection Wires */}
            {connections.map((conn) => {
              const start = getSocketCoordinates(
                conn.fromNodeId,
                conn.fromSocketId,
                "output"
              );
              const end = getSocketCoordinates(
                conn.toNodeId,
                conn.toSocketId,
                "input"
              );
              if (!start || !end) return null;

              const isActive = evalResult.activeConnections.has(conn.id);
              const pathData = makeBezierPath(start.x, start.y, end.x, end.y);

              return (
                <g key={conn.id} className="cursor-pointer pointer-events-auto group">
                  {/* Invisible broad hitbox for clicking/hovering */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="18"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConnection(conn.id);
                    }}
                  />
                  {/* Outer glow line when active */}
                  {isActive && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="6"
                      strokeOpacity="0.4"
                      filter="url(#glow)"
                    />
                  )}
                  {/* Core wire */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={
                      isActive
                        ? "#34d399"
                        : "#64748b"
                    }
                    strokeWidth={isActive ? "3" : "2"}
                    strokeDasharray={isActive ? "6 3" : undefined}
                    className={`transition-colors ${
                      isActive ? "animate-pulse" : "group-hover:stroke-rose-400"
                    }`}
                  />
                </g>
              );
            })}

            {/* Active Draft Connection Wire */}
            {activeDraft && (
              <path
                d={
                  activeDraft.direction === "output"
                    ? makeBezierPath(
                        activeDraft.startX,
                        activeDraft.startY,
                        activeDraft.currentX,
                        activeDraft.currentY
                      )
                    : makeBezierPath(
                        activeDraft.currentX,
                        activeDraft.currentY,
                        activeDraft.startX,
                        activeDraft.startY
                      )
                }
                fill="none"
                stroke={getSocketColor(activeDraft.socketType)}
                strokeWidth="3"
                strokeDasharray="4 4"
              />
            )}
          </svg>

          {/* Render Graph Nodes */}
          <div className="absolute inset-0 pointer-events-auto">
            {evaluatedNodes.map((node) => (
              <GraphNodeCard
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                socketValues={evalResult.socketValues}
                hasIncomingConnection={(socketId) =>
                  connections.some(
                    (c) => c.toNodeId === node.id && c.toSocketId === socketId
                  )
                }
                availableVariables={variableOptions}
                availableScenes={visitedScenes}
                availableItems={inventory}
                availableFlags={Object.keys(flags)}
                onSelect={(e) => handleSelectNode(node, e)}
                onDelete={() => handleDeleteNode(node.id)}
                onSocketMouseDown={(e, socket, dir) =>
                  handleSocketMouseDown(e, node, socket, dir)
                }
                onSocketMouseUp={(e, socket, dir) =>
                  handleSocketMouseUp(e, node, socket, dir)
                }
                onUpdateSocketValue={(sId, val) =>
                  handleUpdateSocketValue(node.id, sId, val)
                }
                onUpdateProperty={(pId, val) =>
                  handleUpdateProperty(node.id, pId, val)
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Node Palette Search Modal */}
      <NodePaletteModal
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelectNode={handleAddNodeFromDef}
        position={paletteSpawnPos}
      />
    </div>
  );
};
