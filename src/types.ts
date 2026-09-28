export type SocketDataType = "boolean" | "number" | "string" | "flow";

export interface NodeSocket {
  id: string;
  name: string;
  type: SocketDataType;
  direction: "input" | "output";
  defaultValue?: boolean | number | string;
  value?: boolean | number | string;
}

export type ExpressionType = "Logical" | "Numeric" | "String";
export type ExpressionGroup = "Inspector" | "Operator" | "Literal";

// Compatibility aliases
export type ExpressionTypeFamily = ExpressionType;
export type ExpressionFunctionalGroup = ExpressionGroup;

export type ExpressionFilter =
  | "All"
  | "Logical"
  | "Numeric"
  | "String"
  | "Inspectors"
  | "Operators"
  | "Literals"
  | "Extensions";

export type ExpressionFilterGroup = ExpressionFilter;

export interface GraphNodeProperty {
  id: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "variable-select";
  value: boolean | number | string;
  options?: Array<{ label: string; value: string }>;
}

export interface GraphNode {
  id: string;
  type: string;
  title: string;
  category: ExpressionType | string;
  expressionType?: ExpressionType;
  expressionGroup?: ExpressionGroup;
  groups?: string[];
  isExtension?: boolean;
  x: number;
  y: number;
  inputs: NodeSocket[];
  outputs: NodeSocket[];
  properties?: Record<string, GraphNodeProperty>;
  evaluatedValue?: boolean | number | string;
  subtitle?: string;
  description?: string;
}

export interface GraphConnection {
  id: string;
  fromNodeId: string;
  fromSocketId: string;
  toNodeId: string;
  toSocketId: string;
}

export interface NodeDefinition {
  type: string;
  title: string;
  expressionType: ExpressionType;
  expressionGroup: ExpressionGroup;
  isExtension?: boolean;
  subtitle?: string;
  description: string;
  inputs: Omit<NodeSocket, "direction">[];
  outputs: Omit<NodeSocket, "direction">[];
  defaultProperties?: Record<string, GraphNodeProperty>;
  color: string;
  category: ExpressionType;
  groups: string[];
}

export interface NodeGraphPreset {
  id: string;
  name: string;
  description: string;
  nodes: GraphNode[];
  connections: GraphConnection[];
}
