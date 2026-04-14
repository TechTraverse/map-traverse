import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mapui:flex mapui:flex-col mapui:items-center mapui:justify-center mapui:min-h-screen mapui:p-8 mapui:text-center">
          <h1 className="mapui:text-2xl mapui:font-bold mapui:text-slate-900 mapui:mb-4">Something went wrong</h1>
          <p className="mapui:text-slate-600 mapui:mb-6 mapui:max-w-md">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <div className="mapui:flex mapui:gap-4">
            <button
              onClick={() => window.location.reload()}
              className="mapui:bg-blue-600 mapui:text-white mapui:px-4 mapui:py-2 mapui:rounded mapui:hover:bg-blue-700"
            >
              Reload page
            </button>
            <a
              href="/configs"
              className="mapui:px-4 mapui:py-2 mapui:border mapui:border-slate-300 mapui:rounded mapui:hover:bg-slate-50 mapui:text-slate-700"
            >
              Back to Configs
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
