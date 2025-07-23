import React, { useState, useEffect } from "react";
import { CalProvider, AvailabilitySettings } from "@calcom/atoms";
import "./CalIntegration.css";

const CalIntegration = ({ userTokens }) => {
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    if (userTokens?.userId) {
      // Fetch access token from our backend
      fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/cal/users/${userTokens.userId}`
      )
        .then(async (res) => {
          const data = await res.json();
          setAccessToken(data.accessToken);
        })
        .catch((error) => {
          console.error("Error fetching access token:", error);
        });
    }
  }, [userTokens?.userId]);

  // Function to call when availability is updated
  const handleAvailabilityUpdate = async () => {
    if (userTokens?.userId) {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/cal/users/${userTokens.userId}/availability-updated`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("Availability timestamp updated:", data);
        } else {
          console.error("Failed to update availability timestamp");
        }
      } catch (error) {
        console.error("Error updating availability timestamp:", error);
      }
    }
  };

  return (
    <CalProvider
      accessToken={accessToken}
      clientId={process.env.REACT_APP_CAL_CLIENT_ID}
      options={{
        apiUrl: process.env.REACT_APP_CAL_API_URL,
        refreshUrl: `${process.env.REACT_APP_API_BASE_URL}/api/cal/refresh`,
      }}
    >
      <div>
        <div className="app-section">
          <h2>Availability Management</h2>
          <div className="cal-availability">
            <AvailabilitySettings onUpdateSuccess={handleAvailabilityUpdate} />
          </div>
        </div>
      </div>
    </CalProvider>
  );
};

export default CalIntegration;
