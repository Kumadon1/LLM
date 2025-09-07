import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
          <h1 style={{ color: 'red' }}>React Error Detected!</h1>
          <h2>Error Message:</h2>
          <pre style={{ background: '#f0f0f0', padding: '10px', overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <h2>Stack Trace:</h2>
          <pre style={{ background: '#f0f0f0', padding: '10px', overflow: 'auto' }}>
            {this.state.error?.stack}
          </pre>
          {this.state.errorInfo && (
            <>
              <h2>Component Stack:</h2>
              <pre style={{ background: '#f0f0f0', padding: '10px', overflow: 'auto' }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

const AppDiagnostic: React.FC = () => {
  console.log('AppDiagnostic rendering...');
  
  try {
    // Try to load the main App
    const App = require('./App').default;
    console.log('App loaded successfully');
    
    return (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Failed to load App:', error);
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <h1 style={{ color: 'red' }}>Failed to Load App!</h1>
        <pre style={{ background: '#f0f0f0', padding: '10px' }}>
          {String(error)}
        </pre>
        <p>Check the browser console for more details.</p>
      </div>
    );
  }
};

export default AppDiagnostic;
