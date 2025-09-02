import { Component, ReactNode } from "react";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.error("ErrorBoundary:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h2 className="text-h2">Something went wrong</h2>
          <p className="text-muted-foreground">Try refreshing or go back.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
