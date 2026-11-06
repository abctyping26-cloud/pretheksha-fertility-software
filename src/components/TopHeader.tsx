import React from "react";
import { Search, Bell, Plus, X, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopHeaderProps {
  pageTitle: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onQuickAction?: () => void;
  staffName?: string;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  pageTitle,
  searchQuery,
  onSearchChange,
  onQuickAction,
  staffName = "Dr. Pretheeksha",
  isDarkMode = false,
  onToggleTheme,
}) => {
  return (
    <header className="app-top-header">
      <div className="header-left">
        <h1 className="header-page-title">{pageTitle}</h1>
      </div>

      <div className="header-right">
        {/* Search Bar - Structured Box with Subtle Curve */}
        <div className="header-search-bar">
          <Search className="search-bar-icon" />
          <input
            type="text"
            className="search-bar-input"
            placeholder="Search patient, phone, code..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery ? (
            <button
              className="search-clear-btn"
              onClick={() => onSearchChange("")}
              type="button"
              title="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <kbd className="search-shortcut-badge">⌘ F</kbd>
          )}
        </div>

        {/* Notification Bell Box Button */}
        <Button
          variant="outline"
          size="icon"
          className="header-icon-btn"
          title="Notifications"
          type="button"
        >
          <Bell className="h-4 w-4" />
        </Button>

        {/* Quick Action (+) Box Button */}
        {onQuickAction && (
          <Button
            variant="default"
            size="icon"
            className="header-icon-btn header-add-btn"
            onClick={onQuickAction}
            title="Register Patient"
            type="button"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {/* Dark / Light Theme Toggle Button (Next to Plus) */}
        {onToggleTheme && (
          <Button
            variant="outline"
            size="icon"
            className="header-icon-btn theme-toggle-btn"
            onClick={onToggleTheme}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            type="button"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        )}

        {/* Staff Profile Box (Matching 38px Height) */}
        <div className="staff-profile-box">
          <div className="staff-avatar-box">
            <span>{staffName.charAt(0)}</span>
          </div>
          <span className="staff-name-text">{staffName}</span>
        </div>
      </div>
    </header>
  );
};
