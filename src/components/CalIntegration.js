import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CalProvider, AvailabilitySettings } from "@calcom/atoms";
import "./CalIntegration.css";

const CalIntegration = () => {
  const { userId } = useParams();
  const [accessToken, setAccessToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const API_BASE = process.env.REACT_APP_API_BASE_URL;
  const CAL_CLIENT_ID = process.env.REACT_APP_CAL_CLIENT_ID;
  const CAL_API_URL = process.env.REACT_APP_CAL_API_URL;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const fetchAccessToken = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/cal/users/${userId}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Failed to fetch access token");

        const { accessToken } = await response.json();
        setAccessToken(accessToken);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error fetching access token:", error);
          setFetchError("Could not load calendar integration.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccessToken();
    return () => controller.abort();
  }, [userId]);

  const handleAvailabilityUpdate = async () => {
    if (!userId) return;
    try {
      await fetch(`${API_BASE}/api/cal/users/${userId}/availability-updated`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error updating availability timestamp:", error);
    }
  };

  if (isLoading) return <p>Loading calendar integration...</p>;
  if (fetchError) return <p className="error">{fetchError}</p>;

  return (
    <CalProvider
      accessToken={accessToken}
      clientId={CAL_CLIENT_ID}
      options={{
        apiUrl: CAL_API_URL,
        refreshUrl: `${API_BASE}/api/cal/refresh`,
      }}
    >
      <div className="app-section">
        <h2>Availability Management</h2>
        <div className="cal-availability">
          <AvailabilitySettings
            onUpdateSuccess={handleAvailabilityUpdate}
            enableOverrides
          />
        </div>
      </div>
    </CalProvider>
  );
};

export default CalIntegration;
