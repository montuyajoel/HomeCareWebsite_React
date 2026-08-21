// src/components/DashboardCard.jsx
import React from 'react';

export default function DashboardCard({ title, icon, children, className = '', footer }) {
  return (
    <div className={`card card-hoverable dashboard-card ${className}`}>
      {(title || icon) && (
        <div className="dashboard-card-header">
          {icon && <div className="dashboard-card-icon">{icon}</div>}
          {title && <h3 className="dashboard-card-title">{title}</h3>}
        </div>
      )}
      <div className="dashboard-card-body">
        {children}
      </div>
      {footer && (
        <div className="dashboard-card-footer">
          {footer}
        </div>
      )}
    </div>
  );
}
