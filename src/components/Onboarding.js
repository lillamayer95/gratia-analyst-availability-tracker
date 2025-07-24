import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Onboarding.css";

const Onboarding = () => {
  const [jsonInput, setJsonInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const userData = JSON.parse(jsonInput);

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/cal/create-managed-user`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create managed user");
      }

      setSuccess(
        `Managed user created successfully! User ID: ${result.userId}`
      );
      setJsonInput("");
      navigate(`/availability/user/${result.userId}`);
    } catch (err) {
      const message =
        err instanceof SyntaxError
          ? "Invalid JSON format. Please check your input."
          : err.message || "Something went wrong.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <h1>Onboard New Analyst</h1>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-group">
        <label htmlFor="jsonInput">Analyst JSON Data:</label>
        <textarea
          id="jsonInput"
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="Enter JSON object for the new analyst..."
          rows={10}
        />
      </div>

      <button
        onClick={handleRegister}
        className="register-button"
        disabled={isLoading || !jsonInput.trim()}
      >
        {isLoading ? "Creating User..." : "Register"}
      </button>
    </div>
  );
};

export default Onboarding;
