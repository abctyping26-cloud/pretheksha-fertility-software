import React from "react";

export const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-wrapper">
      <header className="content-header">
        <h1 className="page-title">Dashboard</h1>
      </header>

      <div className="content-body">
        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">Dashboard</h2>
          </div>
          <div className="card-content">
            <p className="dashboard-placeholder-text">
              Welcome to <strong>abc solutions</strong> clinical management portal.
            </p>
            <div className="info-banner">
              <span className="banner-icon">✓</span>
              <span>All system modules initialized and ready.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
