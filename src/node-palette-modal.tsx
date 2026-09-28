import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Layers,
  ToggleLeft,
  Hash,
  Type,
  Gauge,
  FunctionSquare,
  Database,
  Sparkles,
} from "lucide-react";
import { NODE_DEFINITIONS } from "./node-definitions";
import type {
  NodeDefinition,
  ExpressionFilter,
  ExpressionType,
  ExpressionGroup,
} from "./types";

interface NodePaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (def: NodeDefinition) => void;
  position?: { x: number; y: number };
}

const FILTER_BUTTONS: ExpressionFilter[] = [
  "All",
  "Logical",
  "Numeric",
  "String",
  "Inspectors",
  "Operators",
  "Literals",
  "Extensions",
];

// =========================================================================
// 7 DISTINCT COLORS
// 1. Logical: Emerald (#10b981)
// 2. Numeric: Sky (#0ea5e9)
// 3. String: Purple (#a855f7)
// 4. Inspector: Amber (#f59e0b)
// 5. Operator: Indigo (#6366f1)
// 6. Literal: Rose (#f43f5e)
// 7. Extensions: Fuchsia (#d946ef) [Used strictly on the Extensions filter button]
// =========================================================================

const TYPE_COLORS: Record<
  ExpressionType,
  { primary: string; text: string; bg: string; border: string }
> = {
  Logical: {
    primary: "#10b981",
    text: "#34d399",
    bg: "rgba(16, 185, 129, 0.15)",
    border: "rgba(16, 185, 129, 0.35)",
  },
  Numeric: {
    primary: "#0ea5e9",
    text: "#38bdf8",
    bg: "rgba(14, 165, 233, 0.15)",
    border: "rgba(14, 165, 233, 0.35)",
  },
  String: {
    primary: "#a855f7",
    text: "#c084fc",
    bg: "rgba(168, 85, 247, 0.15)",
    border: "rgba(168, 85, 247, 0.35)",
  },
};

const GROUP_COLORS: Record<
  ExpressionGroup,
  { primary: string; text: string; bg: string; border: string }
> = {
  Inspector: {
    primary: "#f59e0b",
    text: "#fbbf24",
    bg: "rgba(245, 158, 11, 0.15)",
    border: "rgba(245, 158, 11, 0.35)",
  },
  Operator: {
    primary: "#6366f1",
    text: "#818cf8",
    bg: "rgba(99, 102, 241, 0.15)",
    border: "rgba(99, 102, 241, 0.35)",
  },
  Literal: {
    primary: "#f43f5e",
    text: "#fb7185",
    bg: "rgba(244, 63, 94, 0.15)",
    border: "rgba(244, 63, 94, 0.35)",
  },
};

const EXTENSION_BUTTON_COLOR = {
  primary: "#d946ef",
  text: "#f0abfc",
  bg: "rgba(217, 70, 239, 0.15)",
  border: "rgba(217, 70, 239, 0.35)",
};

const TYPE_ICONS: Record<ExpressionType, React.ReactNode> = {
  Logical: <ToggleLeft className="w-4 h-4 text-emerald-400" />,
  Numeric: <Hash className="w-4 h-4 text-sky-400" />,
  String: <Type className="w-4 h-4 text-purple-400" />,
};

const GROUP_ICONS: Record<ExpressionGroup, React.ReactNode> = {
  Inspector: <Gauge className="w-4 h-4 text-amber-400" />,
  Operator: <FunctionSquare className="w-4 h-4 text-indigo-400" />,
  Literal: <Database className="w-4 h-4 text-rose-400" />,
};

const FILTER_RIBBON_ICONS: Record<ExpressionFilter, React.ReactNode> = {
  All: <Layers className="w-3.5 h-3.5 text-slate-300" />,
  Logical: <ToggleLeft className="w-3.5 h-3.5 text-emerald-400" />,
  Numeric: <Hash className="w-3.5 h-3.5 text-sky-400" />,
  String: <Type className="w-3.5 h-3.5 text-purple-400" />,
  Inspectors: <Gauge className="w-3.5 h-3.5 text-amber-400" />,
  Operators: <FunctionSquare className="w-3.5 h-3.5 text-indigo-400" />,
  Literals: <Database className="w-3.5 h-3.5 text-rose-400" />,
  Extensions: <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />,
};

export const NodePaletteModal: React.FC<NodePaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectNode,
  position,
}) => {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<ExpressionFilter>("All");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Is viewing All or by Type (Logical, Numeric, String)
  const isShowingByTypeOrAll =
    selectedFilter === "All" ||
    selectedFilter === "Logical" ||
    selectedFilter === "Numeric" ||
    selectedFilter === "String";

  const filteredDefinitions = NODE_DEFINITIONS.filter((def) => {
    let matchesFilter = true;
    if (selectedFilter === "All") {
      matchesFilter = true;
    } else if (
      selectedFilter === "Logical" ||
      selectedFilter === "Numeric" ||
      selectedFilter === "String"
    ) {
      matchesFilter = def.expressionType === selectedFilter;
    } else if (selectedFilter === "Inspectors") {
      matchesFilter = def.expressionGroup === "Inspector";
    } else if (selectedFilter === "Operators") {
      matchesFilter = def.expressionGroup === "Operator";
    } else if (selectedFilter === "Literals") {
      matchesFilter = def.expressionGroup === "Literal";
    } else if (selectedFilter === "Extensions") {
      matchesFilter = Boolean(def.isExtension);
    }

    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      def.title.toLowerCase().includes(query) ||
      (def.subtitle && def.subtitle.toLowerCase().includes(query)) ||
      def.description.toLowerCase().includes(query) ||
      def.type.toLowerCase().includes(query) ||
      def.expressionType.toLowerCase().includes(query) ||
      def.expressionGroup.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const getFilterButtonActiveStyle = (filter: ExpressionFilter) => {
    if (filter === "All") {
      return {
        color: "#f8fafc",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderColor: "rgba(255, 255, 255, 0.25)",
      };
    }
    if (filter === "Logical" || filter === "Numeric" || filter === "String") {
      const c = TYPE_COLORS[filter];
      return {
        color: c.text,
        backgroundColor: c.bg,
        borderColor: c.border,
      };
    }
    if (filter === "Inspectors") {
      const c = GROUP_COLORS.Inspector;
      return { color: c.text, backgroundColor: c.bg, borderColor: c.border };
    }
    if (filter === "Operators") {
      const c = GROUP_COLORS.Operator;
      return { color: c.text, backgroundColor: c.bg, borderColor: c.border };
    }
    if (filter === "Literals") {
      const c = GROUP_COLORS.Literal;
      return { color: c.text, backgroundColor: c.bg, borderColor: c.border };
    }
    if (filter === "Extensions") {
      const c = EXTENSION_BUTTON_COLOR;
      return { color: c.text, backgroundColor: c.bg, borderColor: c.border };
    }
    return {};
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-[660px] max-w-[92vw] h-[580px] max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={
          position
            ? {
                position: "absolute",
                left: Math.max(20, Math.min(position.x, window.innerWidth - 680)),
                top: Math.max(20, Math.min(position.y, window.innerHeight - 600)),
              }
            : undefined
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Search */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2 shrink-0">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search all Plan B expressions (e.g., Flag, Add, Substring, Extension)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && filteredDefinitions.length > 0) {
                onSelectNode(filteredDefinitions[0]);
                onClose();
              }
            }}
            className="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-500 text-xs focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Ribbon with 7 Distinct Colors */}
        <div className="px-3 py-2.5 bg-slate-900/95 border-b border-slate-800/80 flex flex-wrap items-center gap-1.5 shrink-0 min-h-[46px]">
          {FILTER_BUTTONS.map((filter) => {
            const isActive = selectedFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedFilter(filter)}
                style={isActive ? getFilterButtonActiveStyle(filter) : undefined}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 text-[11px] font-medium leading-none border ${
                  isActive
                    ? "shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-transparent"
                }`}
              >
                {FILTER_RIBBON_ICONS[filter]}
                <span>{filter}</span>
              </button>
            );
          })}
        </div>

        {/* Nodes List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
          {filteredDefinitions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No matching expression nodes found for &ldquo;{search}&rdquo; in {selectedFilter}
            </div>
          ) : (
            filteredDefinitions.map((def) => {
              // Icon logic:
              // When showing All or by Type -> show Type Icon (clean, no circle/border)
              // When showing by Group -> show Group Icon (clean, no circle/border)
              const iconToRender = isShowingByTypeOrAll
                ? TYPE_ICONS[def.expressionType]
                : GROUP_ICONS[def.expressionGroup];

              // Badge logic:
              // When showing All or by Type -> show colored Group badge
              // When showing by Group -> show colored Type badge
              const badgeText = isShowingByTypeOrAll
                ? def.expressionGroup
                : def.expressionType;

              const badgeColor = isShowingByTypeOrAll
                ? GROUP_COLORS[def.expressionGroup]
                : TYPE_COLORS[def.expressionType];

              return (
                <button
                  key={def.type}
                  onClick={() => {
                    onSelectNode(def);
                    onClose();
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-800/90 border border-transparent hover:border-slate-700 transition-all flex items-start gap-3 group"
                >
                  {/* Clean Icon without circular border */}
                  <div className="p-1 shrink-0 mt-0.5">
                    {iconToRender}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-300">
                        {def.title}
                      </span>
                      {/* Context-Aware Colored Badge */}
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium border"
                        style={{
                          color: badgeColor.text,
                          backgroundColor: badgeColor.bg,
                          borderColor: badgeColor.border,
                        }}
                      >
                        {badgeText}
                      </span>
                      {def.subtitle && (
                        <span className="text-[10px] text-slate-400">
                          ({def.subtitle})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {def.description}
                    </p>
                  </div>

                  <div className="text-[10px] text-slate-500 shrink-0 font-mono flex flex-col items-end">
                    <span>{def.inputs.length} in &bull; {def.outputs.length} out</span>
                    <span className="text-[9px] text-slate-400">
                      {isShowingByTypeOrAll ? def.expressionType : def.expressionGroup}
                      {def.isExtension && (
                        <span className="text-fuchsia-400 ml-1 font-semibold">• Extension</span>
                      )}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Info */}
        <div className="px-3 py-2 bg-slate-950/70 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between shrink-0">
          <span>{filteredDefinitions.length} expressions in {selectedFilter}</span>
          <span>Press <kbd className="px-1 py-0.5 bg-slate-800 text-slate-300 rounded">Shift + A</kbd> to add anywhere</span>
        </div>
      </div>
    </div>
  );
};
