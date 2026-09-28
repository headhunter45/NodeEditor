import React from "react";
import {
  Trash2,
  CheckCircle2,
  XCircle,
  Hash,
  ToggleLeft,
  Type,
  Gauge,
  Layers,
  Database,
  ArrowRightCircle,
} from "lucide-react";
import type { GraphNode, NodeSocket, SocketDataType } from "./types";

interface GraphNodeProps {
  node: GraphNode;
  isSelected: boolean;
  socketValues?: Record<string, boolean | number | string>;
  hasIncomingConnection: (socketId: string) => boolean;
  availableVariables?: Array<{ name: string; type: string }>;
  availableScenes?: string[];
  availableItems?: string[];
  availableFlags?: string[];
  onSelect: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onSocketMouseDown: (
    e: React.MouseEvent,
    socket: NodeSocket,
    direction: "input" | "output"
  ) => void;
  onSocketMouseUp: (
    e: React.MouseEvent,
    socket: NodeSocket,
    direction: "input" | "output"
  ) => void;
  onUpdateSocketValue: (socketId: string, val: boolean | number | string) => void;
  onUpdateProperty: (propId: string, val: boolean | number | string) => void;
}

export const getSocketColor = (type: SocketDataType): string => {
  switch (type) {
    case "boolean":
      return "#10b981"; // Emerald
    case "number":
      return "#38bdf8"; // Sky
    case "string":
      return "#c084fc"; // Purple
    case "flow":
      return "#f59e0b"; // Amber
    default:
      return "#94a3b8"; // Slate
  }
};

export const getCategoryColor = (category: string): string => {
  switch (category) {
    case "Logical":
    case "logic":
      return "from-emerald-600 to-teal-700";
    case "Numeric":
    case "math":
      return "from-sky-600 to-blue-700";
    case "String":
      return "from-purple-600 to-violet-700";
    case "comparison":
      return "from-indigo-600 to-blue-700";
    case "variable":
      return "from-purple-600 to-violet-700";
    case "state":
      return "from-cyan-600 to-blue-700";
    case "action":
      return "from-rose-600 to-red-700";
    default:
      return "from-slate-700 to-slate-800";
  }
};

export const GraphNodeCard: React.FC<GraphNodeProps> = ({
  node,
  isSelected,
  socketValues = {},
  hasIncomingConnection,
  availableVariables = [],
  availableScenes = [],
  availableItems = [],
  availableFlags = [],
  onSelect,
  onDelete,
  onSocketMouseDown,
  onSocketMouseUp,
  onUpdateSocketValue,
  onUpdateProperty,
}) => {
  const isActionSink =
    node.type === "action_condition" ||
    node.type === "action_condition_criteria" ||
    node.type === "action_criteria_sink";

  return (
    <div
      onClick={onSelect}
      className={`absolute rounded-xl select-none transition-shadow shadow-2xl backdrop-blur-md text-xs w-64 border ${
        isSelected
          ? "border-amber-400 ring-2 ring-amber-400/30 shadow-amber-500/20"
          : "border-slate-700/80 hover:border-slate-600 bg-slate-900/90"
      }`}
      style={{
        left: node.x,
        top: node.y,
        boxShadow: isSelected
          ? "0 10px 25px -5px rgba(245, 158, 11, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.5)"
          : "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* Blueprint Header */}
      <div
        className={`px-3 py-2 rounded-t-xl bg-gradient-to-r ${getCategoryColor(
          node.category
        )} flex items-center justify-between cursor-move text-white border-b border-white/10`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {(node.category === "Logical" || node.category === "logic") && (
            <ToggleLeft className="w-3.5 h-3.5 shrink-0 opacity-90" />
          )}
          {(node.category === "Numeric" || node.category === "math") && (
            <Hash className="w-3.5 h-3.5 shrink-0 opacity-90" />
          )}
          {node.category === "String" && (
            <Type className="w-3.5 h-3.5 shrink-0 opacity-90" />
          )}
          {node.category === "comparison" && (
            <Layers className="w-3.5 h-3.5 shrink-0 opacity-90" />
          )}
          {node.category === "variable" && (
            <Database className="w-3.5 h-3.5 shrink-0 opacity-90" />
          )}
          {node.category === "state" && (
            <Gauge className="w-3.5 h-3.5 shrink-0 opacity-90" />
          )}
          {node.category === "action" && (
            <ArrowRightCircle className="w-3.5 h-3.5 shrink-0 opacity-90" />
          )}

          <div className="truncate">
            <div className="font-semibold tracking-wide truncate text-[11px] leading-tight">
              {node.title}
            </div>
            {node.subtitle && (
              <div className="text-[9px] text-white/75 truncate leading-none">
                {node.subtitle}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Live Evaluation Badge */}
          {node.evaluatedValue !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 ${
                typeof node.evaluatedValue === "boolean"
                  ? node.evaluatedValue
                    ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/40"
                    : "bg-rose-500/30 text-rose-200 border border-rose-400/40"
                  : "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40"
              }`}
              title={`Evaluated Value: ${node.evaluatedValue}`}
            >
              {typeof node.evaluatedValue === "boolean" ? (
                node.evaluatedValue ? (
                  <CheckCircle2 className="w-2.5 h-2.5" />
                ) : (
                  <XCircle className="w-2.5 h-2.5" />
                )
              ) : null}
              {String(node.evaluatedValue)}
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded hover:bg-black/30 text-white/80 hover:text-white transition-colors"
            title="Delete node"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Node Body */}
      <div className="p-3 space-y-3 bg-slate-900/95 rounded-b-xl">
        {/* Properties Editor if any */}
        {node.properties && Object.keys(node.properties).length > 0 && (
          <div className="space-y-2 pb-1 border-b border-slate-800">
            {Object.entries(node.properties).map(([propKey, prop]) => (
              <div key={propKey} className="space-y-1">
                <label className="text-[10px] text-slate-400 font-medium block">
                  {prop.label}
                </label>

                {node.type === "state_has_flag" && propKey === "flagName" && availableFlags.length > 0 ? (
                  <select
                    value={String(prop.value)}
                    onChange={(e) => onUpdateProperty(propKey, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-amber-500"
                  >
                    {availableFlags.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                ) : node.type === "state_has_item" && propKey === "itemName" && availableItems.length > 0 ? (
                  <select
                    value={String(prop.value)}
                    onChange={(e) => onUpdateProperty(propKey, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-amber-500"
                  >
                    {availableItems.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                ) : (node.type === "state_visited_scene" || node.type === "state_current_scene") && propKey === "sceneName" && availableScenes.length > 0 ? (
                  <select
                    value={String(prop.value)}
                    onChange={(e) => onUpdateProperty(propKey, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-amber-500"
                  >
                    {availableScenes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : prop.type === "variable-select" ? (
                  <select
                    value={String(prop.value)}
                    onChange={(e) => onUpdateProperty(propKey, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-amber-500"
                  >
                    {availableVariables.length > 0 ? (
                      availableVariables.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name} ({v.type})
                        </option>
                      ))
                    ) : (
                      <option value={String(prop.value)}>{String(prop.value)}</option>
                    )}
                  </select>
                ) : prop.type === "select" && prop.options ? (
                  <select
                    value={String(prop.value)}
                    onChange={(e) => onUpdateProperty(propKey, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-amber-500"
                  >
                    {prop.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : prop.type === "number" ? (
                  <input
                    type="number"
                    value={Number(prop.value)}
                    onChange={(e) =>
                      onUpdateProperty(propKey, parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-amber-500 font-mono"
                  />
                ) : prop.type === "boolean" ? (
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={Boolean(prop.value)}
                      onChange={(e) => onUpdateProperty(propKey, e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>{Boolean(prop.value) ? "True" : "False"}</span>
                  </label>
                ) : (
                  <input
                    type="text"
                    value={String(prop.value)}
                    onChange={(e) => onUpdateProperty(propKey, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sockets Row Grid */}
        <div className="flex justify-between items-start gap-4">
          {/* Inputs Column */}
          <div className="flex-1 space-y-2.5">
            {node.inputs.map((socket) => {
              const socketValKey = `${node.id}:${socket.id}`;
              const val = socketValues[socketValKey] ?? socket.value ?? socket.defaultValue;
              const isConnected = hasIncomingConnection(socket.id);
              const color = getSocketColor(socket.type);

              return (
                <div key={socket.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 group">
                    {/* Socket Port Handle */}
                    <div
                      data-socket-id={socket.id}
                      data-node-id={node.id}
                      data-direction="input"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onSocketMouseDown(e, socket, "input");
                      }}
                      onMouseUp={(e) => {
                        e.stopPropagation();
                        onSocketMouseUp(e, socket, "input");
                      }}
                      className="w-3.5 h-3.5 rounded-full border-2 cursor-crosshair transition-transform hover:scale-125 flex items-center justify-center shrink-0 -ml-4"
                      style={{
                        borderColor: color,
                        backgroundColor: isConnected ? color : "#0f172a",
                      }}
                      title={`${socket.name} (${socket.type})`}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>

                    <span className="text-[11px] text-slate-300 font-medium truncate">
                      {socket.name}
                    </span>
                  </div>

                  {/* Fallback inline editor if not connected */}
                  {!isConnected && socket.type !== "flow" && (
                    <div className="pl-1">
                      {socket.type === "boolean" ? (
                        <button
                          type="button"
                          onClick={() => onUpdateSocketValue(socket.id, !val)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                            val
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                              : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                          }`}
                        >
                          {val ? "True" : "False"}
                        </button>
                      ) : socket.type === "number" ? (
                        <input
                          type="number"
                          value={val !== undefined ? Number(val) : 0}
                          onChange={(e) =>
                            onUpdateSocketValue(
                              socket.id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-20 bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-[10px] text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                        />
                      ) : (
                        <input
                          type="text"
                          value={val !== undefined ? String(val) : ""}
                          onChange={(e) =>
                            onUpdateSocketValue(socket.id, e.target.value)
                          }
                          className="w-24 bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-[10px] text-slate-200 focus:outline-none focus:border-amber-500 truncate"
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Outputs Column */}
          <div className="flex-1 space-y-2.5 text-right flex flex-col items-end">
            {node.outputs.map((socket) => {
              const socketValKey = `${node.id}:${socket.id}`;
              const val = socketValues[socketValKey];
              const color = getSocketColor(socket.type);

              return (
                <div
                  key={socket.id}
                  className="flex items-center justify-end gap-2 group w-full"
                >
                  <span className="text-[11px] text-slate-300 font-medium truncate">
                    {socket.name}
                  </span>

                  {/* Value indicator badge if evaluated */}
                  {val !== undefined && socket.type !== "flow" && (
                    <span
                      className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-300 truncate max-w-[50px]"
                      title={String(val)}
                    >
                      {String(val)}
                    </span>
                  )}

                  {/* Socket Port Handle */}
                  <div
                    data-socket-id={socket.id}
                    data-node-id={node.id}
                    data-direction="output"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onSocketMouseDown(e, socket, "output");
                    }}
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      onSocketMouseUp(e, socket, "output");
                    }}
                    className="w-3.5 h-3.5 rounded-full border-2 cursor-crosshair transition-transform hover:scale-125 flex items-center justify-center shrink-0 -mr-4"
                    style={{
                      borderColor: color,
                      backgroundColor: "#0f172a",
                    }}
                    title={`${socket.name} (${socket.type})`}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Criteria Sink Visual Status */}
        {isActionSink && (
          <div
            className={`mt-2 p-2 rounded-lg border flex items-center justify-between text-[11px] ${
              node.evaluatedValue
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/40 border-rose-500/40 text-rose-300"
            }`}
          >
            <span className="font-semibold">Action Gate:</span>
            <span className="font-mono uppercase font-bold">
              {node.evaluatedValue ? "PASSED (Trigger Allowed)" : "BLOCKED (Skipped)"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
