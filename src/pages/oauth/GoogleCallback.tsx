import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { handleGoogleCallback } from '@/services/oauth';

export default function GoogleCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const processCallback = async () => {
            try {
                setStatus('loading');
                setMessage('Processing OAuth callback...');

                const result = await handleGoogleCallback();

                if (result.success) {
                    setStatus('success');
                    setMessage(result.message);

                    // Redirect to settings after a short delay
                    setTimeout(() => {
                        navigate('/settings?connected=success');
                    }, 2000);
                } else {
                    setStatus('error');
                    setMessage(result.message);
                }
            } catch (error) {
                console.error('Error processing OAuth callback:', error);
                setStatus('error');
                setMessage(error.message || 'An unexpected error occurred');
            }
        };

        // Check if we have the required parameters
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            setStatus('error');
            setMessage(`OAuth error: ${error}`);
            return;
        }

        if (!code) {
            setStatus('error');
            setMessage('No authorization code received');
            return;
        }

        processCallback();
    }, [searchParams, navigate]);

    const handleRetry = () => {
        window.location.reload();
    };

    const handleGoToSettings = () => {
        navigate('/settings');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Google OAuth</CardTitle>
                    <CardDescription>
                        {status === 'loading' && 'Processing your connection...'}
                        {status === 'success' && 'Connection successful!'}
                        {status === 'error' && 'Connection failed'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status === 'loading' && (
                        <div className="flex items-center justify-center space-x-2">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span>Processing...</span>
                        </div>
                    )}

                    {status === 'success' && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>{message}</AlertDescription>
                        </Alert>
                    )}

                    {status === 'error' && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{message}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex space-x-2">
                        {status === 'error' && (
                            <Button onClick={handleRetry} variant="outline" className="flex-1">
                                Retry
                            </Button>
                        )}
                        <Button onClick={handleGoToSettings} className="flex-1">
                            Go to Settings
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
