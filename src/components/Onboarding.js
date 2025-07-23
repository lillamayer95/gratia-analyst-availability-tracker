import { useState } from "react";
import "./Onboarding.css";

const Onboarding = ({ onUserCreated }) => {
  const [jsonInput, setJsonInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Parse the JSON input
      let userData;
      console.log("Received JSON input:", jsonInput);
      try {
        userData = JSON.parse(jsonInput);
      } catch (parseError) {
        throw new Error("Invalid JSON format. Please check your input.");
      }

      // Call your backend API to create managed user
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/cal/create-managed-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create managed user");
      }

      const result = await response.json();
      setSuccess(
        `Managed user created successfully! User ID: ${result.userId}`
      );
      setJsonInput(""); // Clear the input after success

      // Pass the user data back to parent component
      if (onUserCreated) {
        onUserCreated({
          userId: result.userId,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          id: result.id,
          createdAt: result.createdAt,
        });
      }
    } catch (err) {
      setError(err.message);
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
