import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ message = "Loading data..." }) => (
  <div className="empty-state">
    <Loader2 className="animate-spin" size={48} color="var(--primary)" style={{ margin: '0 auto', display: 'block' }} />
    <p style={{ marginTop: '1rem' }}>{message}</p>
  </div>
);

export default LoadingSpinner;
