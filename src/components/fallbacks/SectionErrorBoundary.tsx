import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";
import { Card, CardContent } from "@/components/ui/card";

interface SectionErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

interface SectionErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  sectionName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
}

/**
 * ErrorBoundary for individual sections/components
 * Shows a compact error state instead of full-page error
 */
export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<SectionErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    logger.error(
      `SectionErrorBoundary caught an error${this.props.sectionName ? ` in ${this.props.sectionName}` : ''}`,
      { error, errorInfo },
      'ErrorBoundary'
    );

    // Update state with error details
    this.setState({ error, errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    const { maxRetries = 1 } = this.props;

    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, retryCount } = this.state;
      const { maxRetries = 1 } = this.props;
      const canRetry = retryCount < maxRetries;

      return (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">
                  {this.props.sectionName 
                    ? `Error loading ${this.props.sectionName}`
                    : "Something went wrong"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  An error occurred while loading this section. Please try again.
                </p>
              </div>

              {error && import.meta.env.DEV && (
                <div className="text-left bg-muted p-3 rounded-lg max-w-md w-full">
                  <h4 className="font-semibold text-xs mb-1">Error details (dev only):</h4>
                  <pre className="text-xs text-muted-foreground overflow-auto">
                    {error.message}
                  </pre>
                </div>
              )}

              {canRetry && (
                <Button onClick={this.handleRetry} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try again
                </Button>
              )}

              {!canRetry && (
                <p className="text-xs text-muted-foreground">
                  Unable to recover. Please refresh the page.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
