import { useState } from "react";
import { SplashScreen } from "./components/SplashScreen";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import "./App.css";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
      <main className="main-viewport">
        {activeTab === "dashboard" && <Dashboard />}
      </main>
    </div>
  );
}

export default App;
