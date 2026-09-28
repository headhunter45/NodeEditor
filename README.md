# @planb/node-editor

A configurable, schema-driven visual node graph editor for React inspired by Blender and Unreal Engine Blueprints. Includes an interactive canvas with Bezier wire connections, a searchable node palette modal, and a topological expression evaluation engine.

---

## Vision & Architecture

This generic configurable node editor is designed to function with the flexibility and power of visual node editors like Blender:

- **Schema-Driven Architecture**: Operates on a declarative schema for nodes, sockets, and data types with configurable templates for rendering and editing individual node properties.
- **Color-Coded Data Types**: Sockets and wires are color-coded by type (`boolean`, `number`, `string`, `flow`, and planned vector types).
- **Interactive Evaluation**: Real-time topological evaluation traverses upstream inputs to compute live outputs, lighting up active wires as state conditions update.
- **Extensible Catalog**: Includes 50+ built-in logical, numeric, string, inspector, operator, and extension nodes, with the ability to define custom node schemas.
- **Blender-Style Roadmap**:
  - Collapsible nodes and composable node groups.
  - Type-coercion channels (e.g. connecting a `vec3` into a `vec4` socket with zero-padded 4th channel).
  - Built-in muxing/swizzling nodes (e.g., composing `vec4` from a `vec3` + scalar, or two `vec2` inputs).

---

## Installation

Using npm:
```bash
npm install @planb/node-editor
```

Using yarn:
```bash
yarn add @planb/node-editor
```

### Peer Dependencies

Ensure your project has `react` (>= 18.0.0) and `react-dom` installed:
```bash
npm install react react-dom
```

---

## Quick Start

Import `NodeCanvas` and its companion stylesheet:

```tsx
import React, { useState } from "react";
import { NodeCanvas, GraphNode, GraphConnection } from "@planb/node-editor";
import "@planb/node-editor/style.css";

export function VisualGraphView() {
  const [variables, setVariables] = useState({
    playerScore: 75,
    playerHealth: 100,
  });

  const [flags, setFlags] = useState({
    door_unlocked: true,
  });

  const handleGraphChange = (nodes: GraphNode[], connections: GraphConnection[]) => {
    console.log("Graph updated:", { nodes, connections });
  };

  const handleApplyCriteria = (passed: boolean) => {
    console.log("Criteria evaluation passed:", passed);
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <NodeCanvas
        variables={variables}
        flags={flags}
        inventory={["Keycard", "Multitool"]}
        visitedScenes={["Courtyard", "ControlRoom"]}
        currentScene="ControlRoom"
        onGraphChange={handleGraphChange}
        onApplyCriteria={handleApplyCriteria}
      />
    </div>
  );
}
```

---

## Component API

### `<NodeCanvas />`

The primary workspace component rendering the infinite panning/zooming canvas, nodes, wire connections, and toolbar.

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `initialNodes` | `GraphNode[]` | Built-in default | Array of initial nodes loaded into the graph |
| `initialConnections` | `GraphConnection[]` | Built-in default | Array of initial wire connections between node sockets |
| `variables` | `Record<string, boolean \| number \| string>` | `{}` | Runtime variable values referenced by variable inspector nodes |
| `flags` | `Record<string, boolean>` | `{}` | Boolean state flags checked by flag inspector nodes |
| `inventory` | `string[]` | `[]` | Inventory items checked by inventory inspector nodes |
| `visitedScenes` | `string[]` | `[]` | Visited scene IDs checked by scene inspector nodes |
| `currentScene` | `string` | `""` | Current scene ID for contextual state inspection |
| `onGraphChange` | `(nodes: GraphNode[], connections: GraphConnection[]) => void` | `undefined` | Callback invoked whenever nodes or connections are modified |
| `onApplyCriteria` | `(criteriaPassed: boolean) => void` | `undefined` | Callback invoked with the boolean evaluation result of the action gate |

---

## Expression Evaluator

The package includes a standalone topological evaluation engine:

```ts
import { evaluateNodeGraph, EvaluationContext } from "@planb/node-editor";

const context: EvaluationContext = {
  variables: { score: 85, multiplier: 2 },
  flags: { is_ready: true },
  inventory: ["Key"],
  visitedScenes: ["Hangar"],
  currentScene: "Hangar",
};

const result = evaluateNodeGraph(nodes, connections, context);
console.log(result.nodeValues);       // Computed value per node ID
console.log(result.activeConnections); // IDs of connections carrying truthy / non-zero data
console.log(result.finalCriteriaPassed); // Boolean state of the terminal sink
```

---

## Development & Sandbox

This repository includes a standalone interactive demo sandbox with real-time state manipulation:

```bash
# Clone the repository
git clone https://github.com/PlanB/NodeEditor.git
cd NodeEditor

# Install dependencies
npm install

# Start the interactive sandbox
npm run dev

# Run unit and integration tests
npm test

# Typecheck code
npm run typecheck

# Build library bundle and TypeScript declarations
npm run build
```

---

## License

MIT © [Tom Hicks / Plan B Game Studios](LICENSE)
