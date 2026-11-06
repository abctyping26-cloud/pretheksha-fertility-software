import React from "react";
import {
  ChevronsLeft,
  LayoutDashboard,
  Users,
  Calendar,
  Activity,
  FileText,
  CreditCard,
  Settings,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo-icon">P</div>
        <div className="brand-text">
          <span className="brand-name">Pretheeksha</span>
          <span className="brand-tag">Fertility Clinic</span>
        </div>
        <button className="sidebar-collapse-btn" title="Toggle Sidebar" type="button">
          <ChevronsLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Categorized Navigation */}
      <div className="sidebar-scrollable-nav">
        {/* Main Section */}
        <div className="sidebar-nav-section">
          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => onSelectTab("dashboard")}
            type="button"
          >
            <LayoutDashboard className="nav-icon" />
            <span className="nav-label">Dashboard</span>
          </button>
        </div>

        {/* Applications Section */}
        <div className="sidebar-nav-section">
          <div className="nav-group-label">CLINICAL</div>
          <button
            className={`nav-item ${activeTab === "patients" ? "active" : ""}`}
            onClick={() => onSelectTab("patients")}
            type="button"
          >
            <Users className="nav-icon" />
            <span className="nav-label">Patients</span>
          </button>

          <button
            className={`nav-item ${activeTab === "appointments" ? "active" : ""}`}
            onClick={() => onSelectTab("appointments")}
            type="button"
          >
            <Calendar className="nav-icon" />
            <span className="nav-label">Appointments</span>
          </button>

          <button
            className={`nav-item ${activeTab === "cycles" ? "active" : ""}`}
            onClick={() => onSelectTab("cycles")}
            type="button"
          >
            <Activity className="nav-icon" />
            <span className="nav-label">Treatment Cycles</span>
          </button>

          <button
            className={`nav-item ${activeTab === "scans" ? "active" : ""}`}
            onClick={() => onSelectTab("scans")}
            type="button"
          >
            <FileText className="nav-icon" />
            <span className="nav-label">Scans &amp; Lab Reports</span>
          </button>
        </div>

        {/* Management & Billing */}
        <div className="sidebar-nav-section">
          <div className="nav-group-label">MANAGEMENT</div>
          <button
            className={`nav-item ${activeTab === "billing" ? "active" : ""}`}
            onClick={() => onSelectTab("billing")}
            type="button"
          >
            <CreditCard className="nav-icon" />
            <span className="nav-label">Invoices &amp; Payments</span>
          </button>
        </div>

        {/* Support & Logout */}
        <div className="sidebar-nav-section">
          <div className="nav-group-label">SUPPORT</div>
          <button
            className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => onSelectTab("settings")}
            type="button"
          >
            <Settings className="nav-icon" />
            <span className="nav-label">Settings</span>
          </button>

          <button className="nav-item logout-nav-item" type="button">
            <LogOut className="nav-icon logout-icon" />
            <span className="nav-label logout-label">Log Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
