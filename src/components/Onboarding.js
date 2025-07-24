import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Onboarding.css";

const timeZones = [
  { value: "America/New_York", label: "Eastern Time (EST/EDT)" },
  { value: "America/Chicago", label: "Central Time (CST/CDT)" },
  { value: "America/Denver", label: "Mountain Time (MST/MDT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PST/PDT)" },
  { value: "America/Phoenix", label: "Arizona Time (MST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKST/AKDT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

const Onboarding = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate required fields
      if (!email.trim() || !name.trim()) {
        throw new Error("Email and name are required fields");
      }

      const userData = {
        email: email.trim(),
        name: name.trim(),
        timeZone: timezone,
      };

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

      // Clear form
      setEmail("");
      setName("");
      setTimezone("America/New_York");

      navigate(`/availability/user/${result.userId}`);
    } catch (err) {
      setError(err.message || "Something went wrong.");
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
        <label htmlFor="name">Name:</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="timezone">Timezone:</label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          {timeZones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleRegister}
        className="register-button"
        disabled={isLoading || !email.trim() || !name.trim()}
      >
        {isLoading ? "Creating User..." : "Register"}
      </button>
    </div>
  );
};

export default Onboarding;
