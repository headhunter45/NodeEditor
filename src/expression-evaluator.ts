import type { GraphNode, GraphConnection } from "./types";

export interface EvaluationContext {
  variables: Record<string, boolean | number | string>;
  inventory: string[];
  flags: Record<string, boolean>;
  visitedScenes: string[];
  currentScene: string;
}

export interface EvaluationResult {
  nodeValues: Record<string, boolean | number | string>;
  socketValues: Record<string, boolean | number | string>; // key: `${nodeId}:${socketId}`
  activeConnections: Set<string>; // connection IDs carrying boolean truth or non-zero value
  finalCriteriaPassed: boolean;
}

/**
 * Topologically evaluates the directed expression node graph.
 */
export function evaluateNodeGraph(
  nodes: GraphNode[],
  connections: GraphConnection[],
  context: EvaluationContext
): EvaluationResult {
  const nodeValues: Record<string, boolean | number | string> = {};
  const socketValues: Record<string, boolean | number | string> = {};
  const activeConnections = new Set<string>();

  const nodeMap = new Map<string, GraphNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  // Incoming connections map: toNodeId -> connections[]
  const incomingMap = new Map<string, GraphConnection[]>();
  for (const c of connections) {
    const list = incomingMap.get(c.toNodeId) || [];
    list.push(c);
    incomingMap.set(c.toNodeId, list);
  }

  // Helper to resolve an input socket's value: either from incoming connection or fallback default
  function getInputValue(
    node: GraphNode,
    socketId: string,
    defaultFallback: boolean | number | string = false
  ): boolean | number | string {
    const conns = incomingMap.get(node.id) || [];
    const conn = conns.find((c) => c.toSocketId === socketId);
    if (conn) {
      const valKey = `${conn.fromNodeId}:${conn.fromSocketId}`;
      if (valKey in socketValues) {
        return socketValues[valKey];
      }
    }
    const sock = node.inputs.find((s) => s.id === socketId);
    if (sock?.value !== undefined) return sock.value;
    if (sock?.defaultValue !== undefined) return sock.defaultValue;
    return defaultFallback;
  }

  // Topological / dependency resolution with cycle prevention
  const evaluatedNodes = new Set<string>();
  const visiting = new Set<string>();

  function evaluateNode(nodeId: string) {
    if (evaluatedNodes.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      // Cycle detected, break recursion
      return;
    }
    visiting.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) {
      visiting.delete(nodeId);
      return;
    }

    // Evaluate parent nodes first
    const incoming = incomingMap.get(nodeId) || [];
    for (const c of incoming) {
      evaluateNode(c.fromNodeId);
    }

    // Compute this node's values based on type
    let nodeVal: boolean | number | string = false;

    switch (node.type) {
      // ==========================================
      // 1. LOGICAL EXPRESSIONS
      // ==========================================
      case "logical_true":
      case "logic_true": {
        nodeVal = true;
        socketValues[`${node.id}:out`] = true;
        break;
      }
      case "logical_false":
      case "logic_false": {
        nodeVal = false;
        socketValues[`${node.id}:out`] = false;
        break;
      }
      case "logical_and":
      case "logic_and": {
        const a = Boolean(getInputValue(node, "a", true));
        const b = Boolean(getInputValue(node, "b", true));
        nodeVal = a && b;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "logical_or":
      case "logic_or": {
        const a = Boolean(getInputValue(node, "a", false));
        const b = Boolean(getInputValue(node, "b", false));
        nodeVal = a || b;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "logical_not":
      case "logic_not": {
        const inputVal = Boolean(getInputValue(node, "in", false));
        nodeVal = !inputVal;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "is_flag_set":
      case "state_has_flag":
      case "query_has_flag": {
        const propFlag = String(
          node.properties?.flagName?.value ||
          node.properties?.flag?.value ||
          "Alarm_Triggered"
        );
        const flagName = String(getInputValue(node, "flag", propFlag));
        nodeVal = Boolean(context.flags[flagName] || context.variables[flagName]);
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "is_flag_cleared": {
        const propFlag = String(
          node.properties?.flagName?.value ||
          node.properties?.flag?.value ||
          "Alarm_Triggered"
        );
        const flagName = String(getInputValue(node, "flag", propFlag));
        nodeVal = !Boolean(context.flags[flagName] || context.variables[flagName]);
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "has_inventory_item":
      case "state_has_item":
      case "query_has_item": {
        const propItem = String(
          node.properties?.itemName?.value ||
          node.properties?.item?.value ||
          "itm_security_card"
        );
        const itemId = String(getInputValue(node, "item", propItem));
        nodeVal = context.inventory.includes(itemId);
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "has_visited_scene":
      case "state_visited_scene":
      case "query_visited_scene": {
        const propScene = String(
          node.properties?.sceneName?.value ||
          node.properties?.sceneId?.value ||
          "BriefingRoom"
        );
        const sceneId = String(getInputValue(node, "sceneId", propScene));
        nodeVal = context.visitedScenes.includes(sceneId);
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "is_current_scene":
      case "state_current_scene":
      case "query_is_current_scene": {
        const propScene = String(
          node.properties?.sceneName?.value ||
          node.properties?.sceneId?.value ||
          "CommandDeck"
        );
        const sceneId = String(getInputValue(node, "sceneId", propScene));
        nodeVal = context.currentScene.toLowerCase() === sceneId.toLowerCase();
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "has_met_character":
      case "state_has_met_character":
      case "query_has_met_character": {
        const propChar = String(
          node.properties?.characterName?.value ||
          node.properties?.characterId?.value ||
          "chr_karina_svea"
        );
        const charId = String(getInputValue(node, "characterId", propChar));
        nodeVal = Boolean(context.flags[`met_${charId}`] || context.variables[charId]);
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "has_had_conversation": {
        const convId = String(
          node.properties?.conversationId?.value || "conv_detective_intro"
        );
        nodeVal = Boolean(
          context.flags[convId] ||
          context.flags[`conv_${convId}`] ||
          context.variables[convId]
        );
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "is_winning": {
        nodeVal = Boolean(context.variables["is_winning"] || context.flags["is_winning"]);
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "is_losing": {
        nodeVal = Boolean(context.variables["is_losing"] || context.flags["is_losing"]);
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "is_jury_hung": {
        nodeVal = Boolean(context.variables["is_jury_hung"] || context.flags["is_jury_hung"]);
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "will_testify": {
        const witness = String(
          node.properties?.witnessName?.value || "witness_accountant"
        );
        nodeVal = Boolean(
          context.flags[`will_testify_${witness}`] ||
          context.flags[witness] ||
          context.variables[witness]
        );
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "get_variable_logical": {
        const varId = String(
          node.properties?.varName?.value ||
          node.properties?.varId?.value ||
          "Alarm_Triggered"
        );
        nodeVal = Boolean(context.variables[varId] || context.flags[varId]);
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "test_logical_expression": {
        const val = Boolean(getInputValue(node, "in", true));
        const testType = String(node.properties?.testType?.value || "IsTrue");
        if (testType === "IsFalseOrTrue") {
          nodeVal = true;
        } else if (testType === "IsFalse") {
          nodeVal = !val;
        } else {
          nodeVal = val;
        }
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "test_numeric_expression":
      case "comp_gt":
      case "comp_gte":
      case "comp_lt":
      case "comp_lte":
      case "comp_eq":
      case "comp_neq":
      case "compare_values": {
        let op = String(node.properties?.operator?.value || "==");
        if (node.type === "comp_gt") op = ">";
        else if (node.type === "comp_gte") op = ">=";
        else if (node.type === "comp_lt") op = "<";
        else if (node.type === "comp_lte") op = "<=";
        else if (node.type === "comp_eq") op = "==";
        else if (node.type === "comp_neq") op = "!=";

        const a = getInputValue(node, "a", 0);
        const b = getInputValue(node, "b", 0);
        const numA = Number(a);
        const numB = Number(b);
        const isNumeric = !isNaN(numA) && !isNaN(numB);

        if (isNumeric) {
          switch (op) {
            case "==": nodeVal = numA === numB; break;
            case "!=": nodeVal = numA !== numB; break;
            case ">": nodeVal = numA > numB; break;
            case ">=": nodeVal = numA >= numB; break;
            case "<": nodeVal = numA < numB; break;
            case "<=": nodeVal = numA <= numB; break;
            default: nodeVal = numA === numB; break;
          }
        } else {
          switch (op) {
            case "==": nodeVal = String(a) === String(b); break;
            case "!=": nodeVal = String(a) !== String(b); break;
            default: nodeVal = String(a) === String(b); break;
          }
        }
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "test_string_expression": {
        const a = String(getInputValue(node, "a", ""));
        const b = String(getInputValue(node, "b", ""));
        const op = String(node.properties?.operator?.value || "==");
        if (op === "not_empty") {
          nodeVal = a.trim().length > 0;
        } else if (op === "!=") {
          nodeVal = a !== b;
        } else {
          nodeVal = a === b;
        }
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "get_parameter_logical": {
        const paramName = String(
          node.properties?.paramName?.value || "is_enabled"
        );
        nodeVal = Boolean(context.variables[paramName] || context.flags[paramName]);
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "extension_logical": {
        const childVal = Boolean(getInputValue(node, "in", true));
        nodeVal = childVal;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "action_condition_criteria":
      case "action_criteria_sink":
      case "action_condition": {
        const passed = Boolean(getInputValue(node, "condition", true));
        nodeVal = passed;
        socketValues[`${node.id}:flow`] = passed;
        break;
      }

      // ==========================================
      // 2. NUMERIC EXPRESSIONS
      // ==========================================
      case "numeric_add":
      case "math_add": {
        const a = Number(getInputValue(node, "a", 0)) || 0;
        const b = Number(getInputValue(node, "b", 0)) || 0;
        nodeVal = a + b;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "numeric_subtract":
      case "math_subtract": {
        const a = Number(getInputValue(node, "a", 0)) || 0;
        const b = Number(getInputValue(node, "b", 0)) || 0;
        nodeVal = a - b;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "numeric_multiply":
      case "math_multiply": {
        const a = Number(getInputValue(node, "a", 0)) || 0;
        const b = Number(getInputValue(node, "b", 0)) || 0;
        nodeVal = a * b;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "numeric_divide":
      case "math_divide": {
        const a = Number(getInputValue(node, "a", 0)) || 0;
        const b = Number(getInputValue(node, "b", 1)) || 1;
        nodeVal = b !== 0 ? Math.round((a / b) * 100) / 100 : 0;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "numeric_modulus":
      case "math_modulus": {
        const a = Number(getInputValue(node, "a", 0)) || 0;
        const b = Number(getInputValue(node, "b", 1)) || 1;
        nodeVal = b !== 0 ? a % b : 0;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "numeric_negate": {
        const a = Number(getInputValue(node, "a", 0)) || 0;
        nodeVal = -a;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "numeric_power": {
        const a = Number(getInputValue(node, "a", 0)) || 0;
        const b = Number(getInputValue(node, "b", 1)) || 0;
        nodeVal = Math.pow(a, b);
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "numeric_root": {
        const a = Number(getInputValue(node, "a", 0)) || 0;
        const b = Number(getInputValue(node, "b", 2)) || 2;
        nodeVal = b !== 0 ? Math.pow(a, 1 / b) : 0;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "numeric_zero": {
        nodeVal = 0;
        socketValues[`${node.id}:out`] = 0;
        break;
      }
      case "numeric_one": {
        nodeVal = 1;
        socketValues[`${node.id}:out`] = 1;
        break;
      }
      case "numeric_literal":
      case "const_number":
      case "literal_number": {
        nodeVal = Number(
          node.properties?.value?.value ?? node.properties?.val?.value ?? 50
        );
        socketValues[`${node.id}:out`] = nodeVal;
        socketValues[`${node.id}:val`] = nodeVal;
        break;
      }
      case "get_variable_numeric":
      case "var_get": {
        const varId = String(
          node.properties?.varName?.value ||
          node.properties?.varId?.value ||
          "Stealth_Rating"
        );
        const raw = context.variables[varId];
        nodeVal = raw !== undefined ? raw : 0;
        socketValues[`${node.id}:out`] = nodeVal;
        socketValues[`${node.id}:val`] = nodeVal;
        socketValues[`${node.id}:num`] = Number(raw) || 0;
        socketValues[`${node.id}:bool`] = Boolean(raw);
        socketValues[`${node.id}:str`] = String(raw ?? "");
        break;
      }
      case "get_parameter_numeric": {
        const paramName = String(
          node.properties?.paramName?.value || "multiplier"
        );
        nodeVal = Number(context.variables[paramName]) || 0;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "extension_numeric": {
        const childVal = Number(getInputValue(node, "in", 10)) || 0;
        nodeVal = childVal;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }

      // ==========================================
      // 3. STRING EXPRESSIONS
      // ==========================================
      case "string_concatenate": {
        const a = String(getInputValue(node, "a", ""));
        const b = String(getInputValue(node, "b", ""));
        nodeVal = a + b;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "string_left": {
        const text = String(getInputValue(node, "text", ""));
        const len = Math.max(0, Number(getInputValue(node, "length", 1)));
        nodeVal = text.slice(0, len);
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "string_right": {
        const text = String(getInputValue(node, "text", ""));
        const len = Math.max(0, Number(getInputValue(node, "length", 1)));
        nodeVal = len > 0 ? text.slice(-len) : "";
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "string_substring": {
        const text = String(getInputValue(node, "text", ""));
        const start = Math.max(0, Number(getInputValue(node, "start", 0)));
        const len = Math.max(0, Number(getInputValue(node, "length", text.length)));
        nodeVal = text.slice(start, start + len);
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "string_replace": {
        const text = String(getInputValue(node, "text", ""));
        const search = String(getInputValue(node, "search", ""));
        const replace = String(getInputValue(node, "replace", ""));
        nodeVal = search ? text.split(search).join(replace) : text;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "string_to_lowercase": {
        const text = String(getInputValue(node, "text", ""));
        nodeVal = text.toLowerCase();
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "string_to_uppercase": {
        const text = String(getInputValue(node, "text", ""));
        nodeVal = text.toUpperCase();
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "string_to_title_case": {
        const text = String(getInputValue(node, "text", ""));
        nodeVal = text.replace(/\b\w/g, (char) => char.toUpperCase());
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "string_to_sentence_case": {
        const text = String(getInputValue(node, "text", ""));
        nodeVal =
          text.length > 0
            ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
            : "";
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "string_empty": {
        nodeVal = "";
        socketValues[`${node.id}:out`] = "";
        break;
      }
      case "string_literal":
      case "const_string":
      case "literal_string": {
        nodeVal = String(
          node.properties?.value?.value ?? node.properties?.val?.value ?? ""
        );
        socketValues[`${node.id}:out`] = nodeVal;
        socketValues[`${node.id}:val`] = nodeVal;
        break;
      }
      case "get_variable_string": {
        const varId = String(
          node.properties?.varName?.value ||
          node.properties?.varId?.value ||
          "difficulty"
        );
        const raw = context.variables[varId];
        nodeVal = raw !== undefined ? String(raw) : "";
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "get_parameter_string": {
        const paramName = String(
          node.properties?.paramName?.value || "prompt_id"
        );
        nodeVal = String(context.variables[paramName] ?? "");
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }
      case "extension_string": {
        const childVal = String(getInputValue(node, "in", ""));
        nodeVal = childVal;
        socketValues[`${node.id}:out`] = nodeVal;
        break;
      }

      default: {
        nodeVal = true;
        break;
      }
    }

    nodeValues[node.id] = nodeVal;
    evaluatedNodes.add(nodeId);
    visiting.delete(nodeId);
  }

  // Run evaluation for all nodes in graph
  for (const n of nodes) {
    evaluateNode(n.id);
  }

  // Determine active glowing connections
  for (const c of connections) {
    const valKey = `${c.fromNodeId}:${c.fromSocketId}`;
    const v = socketValues[valKey];
    if (v === true || (typeof v === "number" && v > 0)) {
      activeConnections.add(c.id);
    }
  }

  // Determine final criteria result from any action_criteria_sink node, or fallback to true
  const sinkNode = nodes.find(
    (n) =>
      n.type === "action_condition_criteria" ||
      n.type === "action_criteria_sink" ||
      n.type === "action_condition"
  );
  const finalCriteriaPassed = sinkNode ? Boolean(nodeValues[sinkNode.id]) : true;

  return {
    nodeValues,
    socketValues,
    activeConnections,
    finalCriteriaPassed,
  };
}
