// App.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Row,
  Col,
  Container,
  Button,
  ToggleButtonGroup,
  ToggleButton,
} from "react-bootstrap";
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import "bootstrap/dist/css/bootstrap.min.css";

/**
 * Requirements:
 * npm install reactflow react-bootstrap bootstrap
 *
 * This file provides:
 * - JSON formatter (left)
 * - JSON visualizer (right) with React Flow
 * - Hierarchical dragging: moving a parent moves its descendants
 */

function App() {
  const [jsonInput, setJsonInput] = useState("");
  const [formattedJson, setFormattedJson] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("format"); // "format" | "visualize"

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const textareaRef = useRef(null);
  const idCounter = useRef(1);

  // parentMap: { parentIdString: [ childIdString, ... ], ... }
  const parentMap = useRef({});

  // positions snapshot of subtree at drag start:
  // { nodeId: { x, y }, descendantId: {x,y}, ... }
  const dragSnapshot = useRef({});

  useEffect(() => {
    // auto-resize text area
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }

    if (!jsonInput) {
      setFormattedJson("");
      setError("");
      setNodes([]);
      setEdges([]);
      parentMap.current = {};
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      setFormattedJson(JSON.stringify(parsed, null, 2));
      setError("");
      if (mode === "visualize") generateFlow(parsed);
    } catch {
      setFormattedJson("");
      setError("Invalid JSON!");
      setNodes([]);
      setEdges([]);
      parentMap.current = {};
    }
  }, [jsonInput, mode]);

  // Build nodes/edges and parentMap (consistent string IDs)
  const generateFlow = useCallback(
    (obj) => {
      const newNodes = [];
      const newEdges = [];
      const relations = {}; // temporary map parent->children (strings)
      idCounter.current = 1;

      // helper to create a fresh id string
      const nextId = () => {
        const id = String(idCounter.current++);
        return id;
      };

      // recursive generator with horizontal tree layout
      const traverse = (node, depth = 0, centerX = 0, parentId = null) => {
        const currentId = nextId();
        const y = depth * 120;
        const label =
          typeof node === "object"
            ? Array.isArray(node)
              ? "Array"
              : "Object"
            : String(node);

        newNodes.push({
          id: currentId,
          data: { label },
          position: { x: centerX, y },
          draggable: true,
          style: {
            padding: 10,
            borderRadius: 8,
            border: "1px solid #888",
            background: "#f8f9fa",
            minWidth: 120,
            textAlign: "center",
          },
        });

        if (parentId) {
          newEdges.push({
            id: `e${parentId}-${currentId}`,
            source: parentId,
            target: currentId,
          });

          relations[parentId] = relations[parentId] || [];
          relations[parentId].push(currentId);
        }

        // if node has children (object/array), layout children evenly below
        if (typeof node === "object" && node !== null) {
          const entries = Object.entries(node);
          const childCount = entries.length;
          // width per child (tweak as desired)
          const spacing = 220;
          const totalWidth = childCount * spacing;
          const startX = centerX - totalWidth / 2 + spacing / 2;

          entries.forEach(([key, val], i) => {
            const childX = startX + i * spacing;
            const childId = nextId();
            const childLabel =
              typeof val === "object" ? `${key}` : `${key}: ${String(val)}`;

            // child node
            newNodes.push({
              id: childId,
              data: { label: childLabel },
              position: { x: childX, y: y + 120 },
              draggable: true,
              style: {
                padding: 10,
                borderRadius: 8,
                border: "1px solid #aaa",
                background: "#e9ecef",
                minWidth: 150,
                textAlign: "center",
              },
            });

            newEdges.push({
              id: `e${currentId}-${childId}`,
              source: currentId,
              target: childId,
            });

            relations[currentId] = relations[currentId] || [];
            relations[currentId].push(childId);

            // recurse into child value (deeper sub-children)
            if (typeof val === "object" && val !== null) {
              // place deeper subtree centered at this childX
              traverse(val, depth + 2, childX, childId);
            }
          });
        }
      };

      // start traversal from root object centered at x=0
      traverse(obj, 0, 0, null);

      // commit nodes/edges and relations
      setNodes(newNodes);
      setEdges(newEdges);
      parentMap.current = relations;
    },
    [setNodes, setEdges]
  );

  // Utility: collect all descendant ids of a parent (recursive)
  const collectDescendants = (parentId) => {
    const collected = [];
    const stack = parentMap.current[parentId]
      ? [...parentMap.current[parentId]]
      : [];
    while (stack.length) {
      const child = stack.shift();
      collected.push(child);
      const children = parentMap.current[child];
      if (children && children.length) stack.push(...children);
    }
    return collected;
  };

  // onNodeDragStart -> snapshot positions (parent + entire subtree)
  const onNodeDragStart = (_, node) => {
    const nodeId = node.id;
    const descendants = collectDescendants(nodeId);
    const snapshot = {};
    // include the node itself
    snapshot[nodeId] = { x: node.position.x, y: node.position.y };
    // capture positions of current nodes from nodes state
    const nodeMap = {};
    nodes.forEach((n) => {
      nodeMap[n.id] = n.position;
    });
    for (const d of descendants) {
      if (nodeMap[d]) {
        snapshot[d] = { x: nodeMap[d].x, y: nodeMap[d].y };
      } else {
        // if missing in nodes for some reason, set from node object
        snapshot[d] = { x: node.position.x, y: node.position.y + 40 };
      }
    }
    dragSnapshot.current[nodeId] = snapshot;
  };

  // onNodeDrag -> compute delta relative to snapshot and move descendants
  const onNodeDrag = (_, node) => {
    const nodeId = node.id;
    const snapshot = dragSnapshot.current[nodeId];
    if (!snapshot) return;

    const startPos = snapshot[nodeId];
    const dx = node.position.x - startPos.x;
    const dy = node.position.y - startPos.y;

    // update positions of descendants relative to snapshot
    const descendants = Object.keys(snapshot).filter((id) => id !== nodeId);

    if (descendants.length === 0) return; // no children

    setNodes((nds) =>
      nds.map((n) => {
        if (snapshot[n.id]) {
          // new position = original snapshot position + (dx,dy)
          return {
            ...n,
            position: {
              x: snapshot[n.id].x + dx,
              y: snapshot[n.id].y + dy,
            },
          };
        }
        return n;
      })
    );
  };

  // Clean snapshot on drag stop
  const onNodeDragStop = (_, node) => {
    const nodeId = node.id;
    delete dragSnapshot.current[nodeId];
  };

  const handleCopy = () => {
    if (formattedJson) {
      navigator.clipboard.writeText(formattedJson);
      alert("Copied to clipboard!");
    }
  };

  return (
    <Container fluid className="min-vh-100 bg-light py-4">
      <h1 className="text-center mb-4">🧩 DQT JSON Tool</h1>

      <div className="d-flex justify-content-center mb-3">
        <ToggleButtonGroup
          type="radio"
          name="mode"
          value={mode}
          onChange={setMode}
        >
          <ToggleButton id="tbg-btn-1" value="format" variant="outline-primary">
            Format JSON
          </ToggleButton>
          <ToggleButton
            id="tbg-btn-2"
            value="visualize"
            variant="outline-success"
          >
            Visualize JSON
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      <Row className="h-100" style={{ minHeight: "70vh" }}>
        {/* left: input */}
        <Col md={6} className="d-flex flex-column">
          <h4>Input JSON</h4>
          <textarea
            ref={textareaRef}
            className="flex-grow-1 p-3 border rounded shadow-sm resize-none w-100 bg-dark text-white"
            placeholder="Paste your JSON here..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          ></textarea>
          {error && <p className="text-danger mt-2">{error}</p>}
        </Col>

        {/* right: formatted or visualizer */}
        <Col md={6} className="d-flex flex-column">
          {mode === "format" ? (
            <>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h4>Formatted JSON</h4>
                <Button variant="success" size="sm" onClick={handleCopy}>
                  Copy
                </Button>
              </div>
              <textarea
                className="flex-grow-1 p-3 border rounded shadow-sm resize-none w-100 bg-black text-white"
                value={formattedJson}
                readOnly
              ></textarea>
            </>
          ) : (
            <div
              style={{
                height: "70vh",
                border: "1px solid #ddd",
                borderRadius: 8,
                background: "#fff",
              }}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                nodesDraggable
                nodesConnectable={false}
                panOnDrag
                zoomOnScroll
                onNodeDragStart={onNodeDragStart}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
              >
                <Background />
                <Controls />
              </ReactFlow>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default App;
