import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => (
  <div className="loading-container">
    <div className="spinner" />
    <p className="loading-text">{message}</p>
  </div>
);
