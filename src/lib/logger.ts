/**
 * Centralized logging utility
 * Provides consistent logging across the application with environment-based filtering
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    data?: unknown;
    timestamp: string;
    context?: string;
}

class Logger {
    private isDev = import.meta.env.DEV;
    private isProd = import.meta.env.PROD;

    private formatMessage(level: LogLevel, message: string, data?: any, context?: string): LogEntry {
        return {
            level,
            message,
            data,
            timestamp: new Date().toISOString(),
            context,
        };
    }

    private shouldLog(level: LogLevel): boolean {
        // In development, log everything
        if (this.isDev) return true;

        // In production, only log warnings and errors
        if (this.isProd) {
            return level === 'warn' || level === 'error';
        }

        return true;
    }

    private log(level: LogLevel, message: string, data?: any, context?: string): void {
        if (!this.shouldLog(level)) return;

        const entry = this.formatMessage(level, message, data, context);

        // Use appropriate console method
        switch (level) {
            case 'debug':
                console.debug(`[${entry.timestamp}] ${context ? `[${context}] ` : ''}${message}`, data);
                break;
            case 'info':
                console.info(`[${entry.timestamp}] ${context ? `[${context}] ` : ''}${message}`, data);
                break;
            case 'warn':
                console.warn(`[${entry.timestamp}] ${context ? `[${context}] ` : ''}${message}`, data);
                break;
            case 'error':
                console.error(`[${entry.timestamp}] ${context ? `[${context}] ` : ''}${message}`, data);
                break;
        }

        // In production, you might want to send errors to an external service
        if (this.isProd && level === 'error') {
            this.reportError(entry);
        }
    }

    private reportError(entry: LogEntry): void {
        // In a real application, you would send this to an error reporting service
        // like Sentry, LogRocket, or similar
        // This is a placeholder for production error reporting
        if (typeof window !== 'undefined' && window.navigator) {
            // Example: Send to external service
            // errorReportingService.report(entry);
            console.debug("Error reporting placeholder:", entry);
        }
    }

    debug(message: string, data?: unknown, context?: string): void {
        this.log('debug', message, data, context);
    }

    info(message: string, data?: unknown, context?: string): void {
        this.log('info', message, data, context);
    }

    warn(message: string, data?: unknown, context?: string): void {
        this.log('warn', message, data, context);
    }

    error(message: string, data?: unknown, context?: string): void {
        this.log('error', message, data, context);
    }

    // Convenience methods for common patterns
    api(message: string, data?: unknown): void {
        this.debug(message, data, 'API');
    }

    auth(message: string, data?: unknown): void {
        this.info(message, data, 'AUTH');
    }

    ui(message: string, data?: unknown): void {
        this.debug(message, data, 'UI');
    }

    performance(message: string, data?: unknown): void {
        this.info(message, data, 'PERF');
    }
}

// Export singleton instance
export const logger = new Logger();

// Export individual methods for convenience
export const { debug, info, warn, error, api, auth, ui, performance } = logger;

// Export for backward compatibility
export default logger;
