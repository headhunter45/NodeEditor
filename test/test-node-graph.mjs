import assert from "node:assert";
import { evaluateNodeGraph } from "../src/expression-evaluator.ts";
import { NODE_DEFINITIONS } from "../src/node-definitions.ts";

console.log("Running Node Graph Evaluation Tests...");

const context = {
  variables: {
    score: 85,
    health: 40,
    playerName: "Commander",
    is_winning: true,
    multiplier: 3,
    difficulty: "hard",
  },
  flags: {
    alarm_active: false,
    door_unlocked: true,
    conv_detective_intro: true,
    will_testify_witness_accountant: true,
  },
  inventory: ["Access Card", "Laser Cutter"],
  visitedScenes: ["AirLock", "Hangar"],
  currentScene: "Hangar",
};

// =========================================================================
// 1. Catalog Verification (Model Expression Coverage & Filter Group Schema)
// =========================================================================
console.log(`Total Model Expression Definitions: ${NODE_DEFINITIONS.length}`);
assert.ok(NODE_DEFINITIONS.length >= 50, "Should have at least 50 model expression types");

const validTypes = new Set(["Logical", "Numeric", "String"]);
const validGroups = new Set(["Inspector", "Operator", "Literal"]);

for (const def of NODE_DEFINITIONS) {
  assert.ok(validTypes.has(def.expressionType), `${def.type} has valid expressionType: ${def.expressionType}`);
  assert.ok(validGroups.has(def.expressionGroup), `${def.type} has valid expressionGroup: ${def.expressionGroup}`);
  if (def.isExtension) {
    assert.strictEqual(def.expressionGroup, "Inspector", `${def.type} is an extension and must belong to Inspector group`);
  }
}

// Check classification counts
const filterCounts = {
  All: NODE_DEFINITIONS.length,
  Logical: NODE_DEFINITIONS.filter((d) => d.expressionType === "Logical").length,
  Numeric: NODE_DEFINITIONS.filter((d) => d.expressionType === "Numeric").length,
  String: NODE_DEFINITIONS.filter((d) => d.expressionType === "String").length,
  Inspectors: NODE_DEFINITIONS.filter((d) => d.expressionGroup === "Inspector").length,
  Operators: NODE_DEFINITIONS.filter((d) => d.expressionGroup === "Operator").length,
  Literals: NODE_DEFINITIONS.filter((d) => d.expressionGroup === "Literal").length,
  Extensions: NODE_DEFINITIONS.filter((d) => d.isExtension).length,
};
console.log("Filter Group Counts:", filterCounts);
assert.ok(filterCounts.Logical > 0, "Logical expressions populated");
assert.ok(filterCounts.Numeric > 0, "Numeric expressions populated");
assert.ok(filterCounts.String > 0, "String expressions populated");
assert.ok(filterCounts.Inspectors >= 14, "Inspectors group populated with state inspection nodes");
assert.ok(filterCounts.Operators >= 15, "Operators group populated");
assert.ok(filterCounts.Literals >= 7, "Literals group populated with true, false, zero, one, literals");
assert.ok(filterCounts.Extensions >= 6, "Extensions filter includes 3 extension expressions and get_parameter expressions");
console.log("✓ Test 1 Passed: Dual classification (Type + Group + Extensions) verified");

// =========================================================================
// 2. Test Logical Inspectors: has_had_conversation & will_testify & is_winning
// =========================================================================
const testNodesLogical = [
  {
    id: "n-conv",
    type: "has_had_conversation",
    title: "Has Had Conversation",
    category: "Logical",
    x: 0,
    y: 0,
    inputs: [],
    outputs: [{ id: "out", name: "Had Dialogue", type: "boolean", direction: "output" }],
    properties: {
      conversationId: { id: "conversationId", label: "ID", type: "text", value: "conv_detective_intro" },
    },
  },
  {
    id: "n-testify",
    type: "will_testify",
    title: "Will Testify",
    category: "Logical",
    x: 0,
    y: 100,
    inputs: [],
    outputs: [{ id: "out", name: "Testifies", type: "boolean", direction: "output" }],
    properties: {
      witnessName: { id: "witnessName", label: "Witness", type: "text", value: "witness_accountant" },
    },
  },
  {
    id: "n-winning",
    type: "is_winning",
    title: "Is Winning",
    category: "Logical",
    x: 0,
    y: 200,
    inputs: [],
    outputs: [{ id: "out", name: "Winning", type: "boolean", direction: "output" }],
  },
  {
    id: "n-and",
    type: "logical_and",
    title: "And",
    category: "Logical",
    x: 250,
    y: 50,
    inputs: [
      { id: "a", name: "A", type: "boolean", direction: "input" },
      { id: "b", name: "B", type: "boolean", direction: "input" },
    ],
    outputs: [{ id: "out", name: "Result", type: "boolean", direction: "output" }],
  },
];
const testConnsLogical = [
  { id: "c1", fromNodeId: "n-conv", fromSocketId: "out", toNodeId: "n-and", toSocketId: "a" },
  { id: "c2", fromNodeId: "n-testify", fromSocketId: "out", toNodeId: "n-and", toSocketId: "b" },
];
const resLogical = evaluateNodeGraph(testNodesLogical, testConnsLogical, context);
assert.strictEqual(resLogical.nodeValues["n-conv"], true, "Conversation was had");
assert.strictEqual(resLogical.nodeValues["n-testify"], true, "Witness will testify");
assert.strictEqual(resLogical.nodeValues["n-winning"], true, "Is winning");
assert.strictEqual(resLogical.nodeValues["n-and"], true, "AND conjunction true");
console.log("✓ Test 2 Passed: Logical Inspector nodes evaluate accurately");

// =========================================================================
// 3. Test Numeric Operations: Power, Root, Negate, Modulus
// =========================================================================
const testNodesNumeric = [
  {
    id: "n-base",
    type: "numeric_literal",
    title: "Base 4",
    category: "Numeric",
    x: 0,
    y: 0,
    inputs: [],
    outputs: [{ id: "out", name: "Value", type: "number", direction: "output" }],
    properties: { value: { id: "value", label: "Value", type: "number", value: 4 } },
  },
  {
    id: "n-exp",
    type: "numeric_literal",
    title: "Exp 3",
    category: "Numeric",
    x: 0,
    y: 100,
    inputs: [],
    outputs: [{ id: "out", name: "Value", type: "number", direction: "output" }],
    properties: { value: { id: "value", label: "Value", type: "number", value: 3 } },
  },
  {
    id: "n-pow",
    type: "numeric_power",
    title: "Power",
    category: "Numeric",
    x: 200,
    y: 50,
    inputs: [
      { id: "a", name: "Base", type: "number", direction: "input" },
      { id: "b", name: "Exponent", type: "number", direction: "input" },
    ],
    outputs: [{ id: "out", name: "Result", type: "number", direction: "output" }],
  },
  {
    id: "n-neg",
    type: "numeric_negate",
    title: "Negate",
    category: "Numeric",
    x: 400,
    y: 50,
    inputs: [{ id: "a", name: "A", type: "number", direction: "input" }],
    outputs: [{ id: "out", name: "Result", type: "number", direction: "output" }],
  },
];
const testConnsNumeric = [
  { id: "cn1", fromNodeId: "n-base", fromSocketId: "out", toNodeId: "n-pow", toSocketId: "a" },
  { id: "cn2", fromNodeId: "n-exp", fromSocketId: "out", toNodeId: "n-pow", toSocketId: "b" },
  { id: "cn3", fromNodeId: "n-pow", fromSocketId: "out", toNodeId: "n-neg", toSocketId: "a" },
];
const resNumeric = evaluateNodeGraph(testNodesNumeric, testConnsNumeric, context);
assert.strictEqual(resNumeric.nodeValues["n-pow"], 64, "4 ^ 3 should be 64");
assert.strictEqual(resNumeric.nodeValues["n-neg"], -64, "Negate 64 should be -64");
console.log("✓ Test 3 Passed: Numeric Power and Negate evaluate accurately");

// =========================================================================
// 4. Test String Operations: Concatenate, Substring, To Title Case
// =========================================================================
const testNodesString = [
  {
    id: "str-a",
    type: "string_literal",
    title: "Text",
    category: "String",
    x: 0,
    y: 0,
    inputs: [],
    outputs: [{ id: "out", name: "Value", type: "string", direction: "output" }],
    properties: { value: { id: "value", label: "Text", type: "text", value: "plan b for great justice" } },
  },
  {
    id: "str-title",
    type: "string_to_title_case",
    title: "Title Case",
    category: "String",
    x: 200,
    y: 0,
    inputs: [{ id: "text", name: "Text", type: "string", direction: "input" }],
    outputs: [{ id: "out", name: "Result", type: "string", direction: "output" }],
  },
  {
    id: "str-left",
    type: "string_left",
    title: "Left 6",
    category: "String",
    x: 400,
    y: 0,
    inputs: [
      { id: "text", name: "Text", type: "string", direction: "input" },
      { id: "length", name: "Length", type: "number", direction: "input", defaultValue: 6 },
    ],
    outputs: [{ id: "out", name: "Result", type: "string", direction: "output" }],
  },
];
const testConnsString = [
  { id: "cs1", fromNodeId: "str-a", fromSocketId: "out", toNodeId: "str-title", toSocketId: "text" },
  { id: "cs2", fromNodeId: "str-title", fromSocketId: "out", toNodeId: "str-left", toSocketId: "text" },
];
const resString = evaluateNodeGraph(testNodesString, testConnsString, context);
assert.strictEqual(resString.nodeValues["str-title"], "Plan B For Great Justice", "Title case should capitalize each word");
assert.strictEqual(resString.nodeValues["str-left"], "Plan B", "Left 6 of 'Plan B For Great Justice' should be 'Plan B'");
console.log("✓ Test 4 Passed: String Title Case and Left substring evaluate accurately");

// =========================================================================
// 5. Test Extension and Parameter Nodes
// =========================================================================
const testNodesExt = [
  {
    id: "p-num",
    type: "get_parameter_numeric",
    title: "Get Parameter",
    category: "Numeric",
    x: 0,
    y: 0,
    inputs: [],
    outputs: [{ id: "out", name: "Value", type: "number", direction: "output" }],
    properties: { paramName: { id: "paramName", label: "Name", type: "text", value: "multiplier" } },
  },
  {
    id: "ext-num",
    type: "extension_numeric",
    title: "Extension",
    category: "Numeric",
    x: 200,
    y: 0,
    inputs: [{ id: "in", name: "Input", type: "number", direction: "input" }],
    outputs: [{ id: "out", name: "Result", type: "number", direction: "output" }],
  },
];
const testConnsExt = [
  { id: "ce1", fromNodeId: "p-num", fromSocketId: "out", toNodeId: "ext-num", toSocketId: "in" },
];
const resExt = evaluateNodeGraph(testNodesExt, testConnsExt, context);
assert.strictEqual(resExt.nodeValues["p-num"], 3, "Parameter multiplier should evaluate to 3");
assert.strictEqual(resExt.nodeValues["ext-num"], 3, "Numeric Extension should output input 3");
console.log("✓ Test 5 Passed: Extension and parameter nodes evaluate accurately");

console.log("All Node Graph Evaluation Tests Passed Successfully!");
