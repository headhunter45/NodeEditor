import { useState } from "react";
import { NodeCanvas } from "../src/node-canvas";
import type { GraphNode, GraphConnection } from "../src/types";
import { Sparkles, Sliders, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

export function App() {
  const [variables, setVariables] = useState<Record<string, boolean | number | string>>({
    playerScore: 65,
    playerHealth: 100,
    difficulty: "normal",
  });

  const [flags, setFlags] = useState<Record<string, boolean>>({
    found_secret_clue: true,
    met_alchemist: false,
  });

  const [inventory] = useState<string[]>(["Bronze Key", "Old Journal", "Laser Cutter"]);
  const [visitedScenes] = useState<string[]>(["Courtyard", "Library", "Bridge"]);
  const [currentScene] = useState<string>("Courtyard");

  const [criteriaPassed, setCriteriaPassed] = useState<boolean | null>(null);
  const [nodeCount, setNodeCount] = useState<number>(0);
  const [connectionCount, setConnectionCount] = useState<number>(0);
  const [showConfig, setShowConfig] = useState<boolean>(true);

  const handleGraphChange = (nodes: GraphNode[], connections: GraphConnection[]) => {
    setNodeCount(nodes.length);
    setConnectionCount(connections.length);
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header Bar */}
      <header className="h-14 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between z-20 shrink-0 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-slate-100">
              Plan B Node Editor
            </h1>
            <p className="text-[11px] text-slate-400">
              Generic configurable visual graph editor & expression evaluator
            </p>
          </div>
        </div>

        {/* Center Live Evaluation Criteria Pill */}
        <div className="flex items-center gap-3">
          {criteriaPassed !== null && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                criteriaPassed
                  ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-400"
                  : "bg-rose-950/80 border-rose-500/50 text-rose-400"
              }`}
            >
              {criteriaPassed ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              <span>Criteria: {criteriaPassed ? "Passed" : "Failed"}</span>
            </div>
          )}

          <div className="text-xs text-slate-400 font-mono bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
            {nodeCount} Nodes · {connectionCount} Wires
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              showConfig
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Test Context</span>
          </button>
        </div>
      </header>

      {/* Main Area: Context Side Drawer + NodeCanvas */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Collapsible Test Context Panel */}
        {showConfig && (
          <aside className="w-72 bg-slate-900/95 border-r border-slate-800 p-4 flex flex-col gap-4 z-10 overflow-y-auto shrink-0 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Live State Context
              </span>
              <button
                onClick={() => {
                  setVariables({ playerScore: 65, playerHealth: 100, difficulty: "normal" });
                  setFlags({ found_secret_clue: true, met_alchemist: false });
                }}
                className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center gap-1"
                title="Reset Context"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Numeric / Text Variables */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-amber-400">Variables</div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">playerScore</span>
                  <span className="text-amber-400 font-mono">{variables.playerScore}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Number(variables.playerScore)}
                  onChange={(e) =>
                    setVariables((prev) => ({ ...prev, playerScore: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">playerHealth</span>
                  <span className="text-amber-400 font-mono">{variables.playerHealth}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Number(variables.playerHealth)}
                  onChange={(e) =>
                    setVariables((prev) => ({ ...prev, playerHealth: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Boolean Flags */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-xs font-medium text-emerald-400">Flags</div>

              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-800/60">
                <span>found_secret_clue</span>
                <input
                  type="checkbox"
                  checked={Boolean(flags.found_secret_clue)}
                  onChange={(e) =>
                    setFlags((prev) => ({ ...prev, found_secret_clue: e.target.checked }))
                  }
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-800/60">
                <span>met_alchemist</span>
                <input
                  type="checkbox"
                  checked={Boolean(flags.met_alchemist)}
                  onChange={(e) =>
                    setFlags((prev) => ({ ...prev, met_alchemist: e.target.checked }))
                  }
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            {/* Inventory / Scenes preview */}
            <div className="space-y-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <div className="font-medium text-purple-400">Inventory Items</div>
              <div className="flex flex-wrap gap-1">
                {inventory.map((item) => (
                  <span
                    key={item}
                    className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-[10px]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="font-medium text-sky-400 pt-2">Current Scene</div>
              <div className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-[10px]">
                {currentScene}
              </div>
            </div>
          </aside>
        )}

        {/* Node Canvas Full Viewport */}
        <main className="flex-1 relative h-full w-full">
          <NodeCanvas
            variables={variables}
            flags={flags}
            inventory={inventory}
            visitedScenes={visitedScenes}
            currentScene={currentScene}
            onGraphChange={handleGraphChange}
            onApplyCriteria={(passed) => setCriteriaPassed(passed)}
          />
        </main>
      </div>
    </div>
  );
}
