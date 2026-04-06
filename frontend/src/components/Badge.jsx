import React from 'react';

const Badge = ({ children, variant = 'success' }) => (
  <span className={`badge badge-${variant}`}>{children}</span>
);

export default Badge;
