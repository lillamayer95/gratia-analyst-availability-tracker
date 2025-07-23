import React, { useState } from "react";
import "@calcom/atoms/globals.min.css";
import "./App.css";
import Onboarding from "./components/Onboarding";
import CalIntegration from "./components/CalIntegration";

function App() {
  const [userTokens, setUserTokens] = useState(null);

  const handleUserCreated = (userData) => {
    console.log("User created with data:", userData);
    setUserTokens({
      accessToken: userData.accessToken,
      refreshToken: userData.refreshToken,
      userId: userData.userId,
    });
  };

  return (
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
          <CalIntegration userTokens={userTokens} />
        )}
      </main>
    </div>
  );
}

export default App;
