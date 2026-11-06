import { useState, useEffect } from "react";
import { SplashScreen } from "./components/SplashScreen";
import { Sidebar } from "./components/Sidebar";
import { TopHeader } from "./components/TopHeader";
import { Dashboard } from "./components/Dashboard";
import { PatientsManager } from "./components/PatientsManager";
import { InvoicesManager } from "./components/InvoicesManager";
import { SettingsManager } from "./components/SettingsManager";
import "./App.css";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState("billing");
  const [headerSearch, setHeaderSearch] = useState("");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Automatic dark mode detection with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("pretheeksha_theme");
      if (saved === "dark") return true;
      if (saved === "light") return false;
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  // Keep <html> class synchronized with dark mode state
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Listen to OS system theme changes if no manual preference is saved
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem("pretheeksha_theme");
      if (!saved) {
        setIsDarkMode(e.matches);
      }
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("pretheeksha_theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  const getPageTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Dashboard";
      case "patients":
        return "Patient";
      case "appointments":
        return "Appointments";
      case "cycles":
        return "Treatment Cycles";
      case "scans":
        return "Scans & Lab Reports";
      case "billing":
        return "Invoices & Payments";
      case "settings":
        return "Settings";
      default:
        return "Patient";
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
      <main className="main-viewport">
        <TopHeader
          pageTitle={getPageTitle()}
          searchQuery={headerSearch}
          onSearchChange={setHeaderSearch}
          onQuickAction={() => setIsRegisterOpen(true)}
          staffName="Dr. Pretheeksha"
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
        />
        <div className="main-content-scrollable">
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab === "patients" && (
            <PatientsManager
              searchQuery={headerSearch}
              isRegisterOpen={isRegisterOpen}
              onOpenRegister={() => setIsRegisterOpen(true)}
              onCloseRegister={() => setIsRegisterOpen(false)}
            />
          )}
          {activeTab === "billing" && (
            <InvoicesManager searchQuery={headerSearch} />
          )}
          {activeTab === "settings" && <SettingsManager />}
        </div>
      </main>
    </div>
  );
}

export default App;
