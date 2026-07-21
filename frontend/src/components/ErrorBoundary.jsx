import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-8 max-w-2xl w-full shadow-lg">
            <div className="flex items-center gap-4 text-red-500 mb-6">
              <AlertTriangle className="w-12 h-12" />
              <h1 className="text-2xl font-bold">Something went wrong.</h1>
            </div>
            
            <p className="text-[var(--text-muted)] mb-6">
              The application encountered an unexpected error. We've logged this internally, but you can try reloading the page to recover.
            </p>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-8 overflow-auto max-h-64">
              <pre className="text-red-400 font-mono text-xs whitespace-pre-wrap">
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full justify-center"
            >
              <RefreshCcw className="w-5 h-5" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
