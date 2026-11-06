import React from "react";

export const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-wrapper">
      <div className="content-body">
        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">Clinic Overview</h2>
          </div>
          <div className="card-content">
            <p className="dashboard-placeholder-text">
              Welcome to <strong>Pretheeksha Fertility Clinic</strong> clinical management portal.
            </p>
            <div className="info-banner">
              <span className="banner-icon">✓</span>
              <span>All system modules initialized and operational.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
