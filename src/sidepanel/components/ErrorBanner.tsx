import React from 'react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => (
  <div className="error-banner">
    <span className="error-icon">!</span>
    <span className="error-message">
      {message === 'SESSION_EXPIRED'
        ? 'Session expired. Please refresh your Salesforce tab and reopen this panel.'
        : message}
    </span>
    {onRetry && (
      <button className="error-retry" onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
);
