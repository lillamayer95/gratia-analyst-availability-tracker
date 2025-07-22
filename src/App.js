import React, { useState, useEffect } from "react";
import "@calcom/atoms/globals.min.css";
import "./App.css";
import { CalProvider } from "@calcom/atoms";
import Onboarding from "./components/Onboarding";
import CalAvailability from "./components/CalAvailability";

function App() {
  const [userTokens, setUserTokens] = useState(null);
  const [accessToken, setAccessToken] = useState("");

  const handleUserCreated = (userData) => {
    console.log("User created with data:", userData);
    setUserTokens({
      accessToken: userData.accessToken,
      refreshToken: userData.refreshToken,
      userId: userData.userId,
    });
  };

  useEffect(() => {
    if (userTokens?.userId) {
      // Fetch access token from our backend
      fetch(`http://localhost:5000/api/cal/users/${userTokens.userId}`)
        .then(async (res) => {
          const data = await res.json();
          setAccessToken(data.accessToken);
        })
        .catch((error) => {
          console.error("Error fetching access token:", error);
        });
    }
  }, [userTokens?.userId]);

  return (
    <CalProvider
      accessToken={accessToken}
      clientId="cmdbodi72003dp51r94x2ob2x"
      options={{
        apiUrl: "https://api.cal.com/v2",
        refreshUrl: "http://localhost:5000/api/cal/refresh",
      }}
    >
      <div className="App">
        <header className="App-header">
          <h1>Gratia Analyst Availability Tracker</h1>
        </header>

        <main className="App-main">
          {!userTokens ? (
            <div className="app-section">
              <h2>Get Started</h2>
              <Onboarding onUserCreated={handleUserCreated} />
            </div>
          ) : (
            <div>
              <div className="user-info">
                <h3>Connected User</h3>
                <p>User ID: {userTokens.userId}</p>
              </div>
              <div className="app-section">
                <h2>Availability Management</h2>
                <CalAvailability />
              </div>
            </div>
          )}
        </main>
      </div>
    </CalProvider>
  );
}

export default App;
