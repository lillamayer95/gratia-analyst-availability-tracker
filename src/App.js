import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "@calcom/atoms/globals.min.css";
import "./App.css";
import Onboarding from "./components/Onboarding";
import CalIntegration from "./components/CalIntegration";

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Gratia Analyst Availability Tracker</h1>
        </header>

        <main className="App-main">
          <Routes>
            <Route
              path="/"
              element={
                <div className="app-section">
                  <h2>Get Started</h2>
                  <Onboarding />
                </div>
              }
            />
            <Route
              path="/availability/user/:userId"
              element={<CalIntegration />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
