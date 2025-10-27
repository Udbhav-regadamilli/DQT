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

function App() {
  const [jsonInput, setJsonInput] = useState("");
  const [formattedJson, setFormattedJson] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("format");

  // ✅ useNodesState and useEdgesState instead of useState
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const textareaRef = useRef(null);
  const idCounter = useRef(1);

  useEffect(() => {
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
    }
  }, [jsonInput, mode]);

  const generateFlow = useCallback(
    (obj) => {
      const newNodes = [];
      const newEdges = [];
      idCounter.current = 1;

      const traverse = (obj, depth = 0, parentId = null, parentY = 0) => {
        const currentId = idCounter.current++;
        const yOffset = currentId * 80;

        newNodes.push({
          id: String(currentId),
          data: {
            label: Array.isArray(obj)
              ? "Array"
              : typeof obj === "object"
              ? "Object"
              : String(obj),
          },
          position: { x: depth * 250, y: parentY + yOffset },
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
            source: String(parentId),
            target: String(currentId),
          });
        }

        if (typeof obj === "object" && obj !== null) {
          Object.entries(obj).forEach(([key, val]) => {
            const childId = idCounter.current++;
            const childY = yOffset + childId * 60;

            newNodes.push({
              id: String(childId),
              data: {
                label: `${key}: ${typeof val === "object" ? "" : String(val)}`,
              },
              position: { x: (depth + 1) * 250, y: parentY + childY },
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
              source: String(currentId),
              target: String(childId),
            });

            if (typeof val === "object" && val !== null) {
              traverse(val, depth + 2, childId, parentY + childY);
            }
          });
        }
      };

      traverse(obj);
      setNodes(newNodes);
      setEdges(newEdges);
    },
    [setNodes, setEdges]
  );

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
        {/* Input JSON */}
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

        {/* Output / Visualization */}
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
                nodesConnectable={true}
                panOnDrag
                zoomOnScroll
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
