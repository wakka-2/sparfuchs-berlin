import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this is where you'd send to Sentry / error tracking
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <span className="text-5xl" aria-hidden="true">⚠️</span>
          <h2 className="text-xl font-semibold text-gray-800">
            Etwas ist schiefgelaufen / Something went wrong
          </h2>
          <p className="max-w-md text-sm text-gray-500">
            {this.state.error?.message ?? "Ein unbekannter Fehler ist aufgetreten."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            Seite neu laden / Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
