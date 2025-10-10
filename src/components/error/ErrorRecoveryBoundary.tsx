/**
 * Error Recovery Boundary
 * Enhanced error boundary with recovery mechanisms
 */

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { logger } from '@/lib/logger';
import { executeWithRecovery } from '@/lib/errorRecovery';

interface ErrorRecoveryBoundaryState {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
    recoveryAttempts: number;
    isRecovering: boolean;
}

interface ErrorRecoveryBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    onRecovery?: (attempts: number) => void;
    maxRecoveryAttempts?: number;
    enableAutoRecovery?: boolean;
    recoveryDelay?: number;
}

export class ErrorRecoveryBoundary extends Component<
    ErrorRecoveryBoundaryProps,
    ErrorRecoveryBoundaryState
> {
    private recoveryTimeout?: NodeJS.Timeout;

    constructor(props: ErrorRecoveryBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            recoveryAttempts: 0,
            isRecovering: false
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorRecoveryBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        logger.error('ErrorRecoveryBoundary caught an error', { error, errorInfo }, 'ErrorBoundary');

        this.setState({ error, errorInfo });

        // Call custom error handler
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Attempt automatic recovery if enabled
        if (this.props.enableAutoRecovery) {
            this.attemptAutoRecovery();
        }
    }

    componentWillUnmount() {
        if (this.recoveryTimeout) {
            clearTimeout(this.recoveryTimeout);
        }
    }

    private attemptAutoRecovery = async () => {
        const { maxRecoveryAttempts = 3, recoveryDelay = 1000 } = this.props;
        const { recoveryAttempts } = this.state;

        if (recoveryAttempts >= maxRecoveryAttempts) {
            logger.warn('Max recovery attempts reached', { recoveryAttempts });
            return;
        }

        this.setState({ isRecovering: true });

        try {
            const result = await executeWithRecovery(
                async () => {
                    // Simulate recovery operation
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return true;
                },
                {
                    maxRetries: 1,
                    baseDelay: recoveryDelay,
                    timeout: 5000
                }
            );

            if (result.success) {
                logger.info('Error recovery successful', { attempts: recoveryAttempts + 1 });
                this.setState({
                    hasError: false,
                    error: undefined,
                    errorInfo: undefined,
                    recoveryAttempts: 0,
                    isRecovering: false
                });

                if (this.props.onRecovery) {
                    this.props.onRecovery(recoveryAttempts + 1);
                }
            } else {
                throw new Error('Recovery failed');
            }
        } catch (error) {
            logger.error('Error recovery failed', { error, attempts: recoveryAttempts + 1 });

            this.setState(prevState => ({
                recoveryAttempts: prevState.recoveryAttempts + 1,
                isRecovering: false
            }));

            // Schedule next recovery attempt
            this.recoveryTimeout = setTimeout(() => {
                this.attemptAutoRecovery();
            }, recoveryDelay * (recoveryAttempts + 1));
        }
    };

    private handleRetry = () => {
        this.setState({
            hasError: false,
            error: undefined,
            errorInfo: undefined,
            recoveryAttempts: 0,
            isRecovering: false
        });
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    private handleRefresh = () => {
        window.location.reload();
    };

    private handleReportBug = () => {
        const { error, errorInfo } = this.state;
        const bugReport = {
            error: error?.message,
            stack: error?.stack,
            componentStack: errorInfo?.componentStack,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };

        logger.error('Bug report generated', bugReport, 'BugReport');

        // In a real application, you would send this to a bug reporting service
        alert('Bug report has been logged. Thank you for your feedback!');
    };

    render() {
        if (this.state.hasError) {
            const { fallback, maxRecoveryAttempts = 3 } = this.props;
            const { error, recoveryAttempts, isRecovering } = this.state;

            if (fallback) {
                return fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>

                        <div className="text-center">
                            <h1 className="text-xl font-semibold text-gray-900 mb-2">
                                Something went wrong
                            </h1>

                            <p className="text-gray-600 mb-4">
                                {isRecovering
                                    ? `Attempting to recover... (${recoveryAttempts + 1}/${maxRecoveryAttempts})`
                                    : 'An unexpected error occurred. We\'re working to fix it.'
                                }
                            </p>

                            {error && process.env.NODE_ENV === 'development' && (
                                <details className="mb-4 text-left">
                                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                                        Error Details
                                    </summary>
                                    <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                                        {error.message}
                                        {error.stack && `\n\n${error.stack}`}
                                    </pre>
                                </details>
                            )}

                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                <Button
                                    onClick={this.handleRetry}
                                    disabled={isRecovering}
                                    className="flex items-center gap-2"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRecovering ? 'animate-spin' : ''}`} />
                                    {isRecovering ? 'Recovering...' : 'Try Again'}
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={this.handleGoHome}
                                    className="flex items-center gap-2"
                                >
                                    <Home className="w-4 h-4" />
                                    Go Home
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={this.handleRefresh}
                                    className="flex items-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Refresh Page
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={this.handleReportBug}
                                    className="flex items-center gap-2"
                                >
                                    <Bug className="w-4 h-4" />
                                    Report Bug
                                </Button>
                            </div>

                            {recoveryAttempts > 0 && (
                                <p className="mt-4 text-sm text-gray-500">
                                    Recovery attempts: {recoveryAttempts}/{maxRecoveryAttempts}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorRecoveryBoundary;
