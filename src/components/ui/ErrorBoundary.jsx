import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Keep console.error for monitoring
    console.error('Unhandled UI Exception caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="eb-container">
          <div className="eb-card glass animate-fade-in-up">
            <div className="eb-icon">⚡</div>
            <h2 className="eb-title">Something unexpected happened</h2>
            <p className="eb-desc">
              TripVault encountered an unexpected error while loading this component. Your data remains safe and synchronized.
            </p>
            <div className="eb-actions">
              <button className="btn btn-primary" onClick={this.handleReload}>
                Reload Page
              </button>
              <button className="btn btn-secondary" onClick={this.handleGoHome}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
