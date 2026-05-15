import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

function reportClientError(error: Error, info?: React.ErrorInfo) {
  const payload = {
    event: "client_error",
    message: error.message,
    stack: error.stack,
    componentStack: info?.componentStack,
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  };

  // Keep the app dependency-free. Platforms can collect this from browser logs,
  // and teams can later route it to an external endpoint/Sentry without touching
  // feature code.
  console.error(JSON.stringify(payload));
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportClientError(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "var(--bg, #f8fafc)",
            color: "var(--fg, #111827)",
          }}
        >
          <section style={{ maxWidth: 460, textAlign: "center" }}>
            <h1 style={{ marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ marginBottom: 20 }}>
              The error has been logged for investigation. Please refresh the page or try again shortly.
            </p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
