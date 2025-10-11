import { useState, useEffect, useRef } from "react";
import { Row, Col, Container, Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  const [jsonInput, setJsonInput] = useState("");
  const [formattedJson, setFormattedJson] = useState("");
  const [error, setError] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }

    if (!jsonInput) {
      setFormattedJson("");
      setError("");
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      setFormattedJson(JSON.stringify(parsed, null, 2));
      setError("");
    } catch (err) {
      setFormattedJson("");
      setError("Invalid JSON!");
    }
  }, [jsonInput]);

  const handleCopy = () => {
    if (formattedJson) {
      navigator.clipboard.writeText(formattedJson);
      alert("Copied to clipboard!");
    }
  };

  return (
    <Container fluid className="min-vh-100 bg-light py-4">
      <h1 className="text-center mb-4">DQT JSON Formatter</h1>

      <Row className="h-100" style={{ minHeight: "70vh" }}>
        {/* Input Column */}
        <Col md={6} className="d-flex flex-column">
          <h4>Input JSON</h4>
          <textarea
            ref={textareaRef}
            className="flex-grow-1 p-3 border rounded shadow-sm resize-none w-100 text-white"
            placeholder="Paste your JSON here..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          ></textarea>
          {error && <p className="text-danger mt-2">{error}</p>}
        </Col>

        {/* Output Column */}
        <Col md={6} className="d-flex flex-column">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4>Formatted JSON</h4>
            <Button variant="success" size="sm" onClick={handleCopy}>
              Copy
            </Button>
          </div>
          <textarea
            ref={textareaRef}
            className="flex-grow-1 p-3 border rounded shadow-sm resize-none w-100"
            value={formattedJson}
            disabled={true}
          ></textarea>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
