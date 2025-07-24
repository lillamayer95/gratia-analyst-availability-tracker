import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CalProvider, AvailabilitySettings } from "@calcom/atoms";
import "./CalIntegration.css";

const CalIntegration = () => {
  const { userId } = useParams();
  const [accessToken, setAccessToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const fetchToken = async () => {
      if (!userId) return;

      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/cal/users/${userId}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error("Failed to fetch access token");

        const data = await response.json();
        setAccessToken(data.accessToken);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error fetching access token:", error);
          setFetchError("Could not load calendar integration.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
    return () => controller.abort();
  }, [userId]);

  const handleAvailabilityUpdate = async () => {
    if (!userId) return;
    try {
      await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/cal/users/${userId}/availability-updated`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error updating availability timestamp:", error);
    }
  };

  if (isLoading) return <p>Loading calendar integration...</p>;
  if (fetchError) return <p className="error">{fetchError}</p>;

  return (
    <CalProvider
      accessToken={accessToken}
      clientId={process.env.REACT_APP_CAL_CLIENT_ID}
      options={{
        apiUrl: process.env.REACT_APP_CAL_API_URL,
        refreshUrl: `${process.env.REACT_APP_API_BASE_URL}/api/cal/refresh`,
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
