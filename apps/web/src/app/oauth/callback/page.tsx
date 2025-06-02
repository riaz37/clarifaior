"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Spinner } from '@repo/ui/spinner';
import { CheckCircle, AlertCircle } from 'lucide-react';
import AuthService from '../../../lib/auth-service';
import { useErrorHandler } from '../../../lib/error-handler';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleError } = useErrorHandler();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const provider = searchParams.get('provider') as 'google' | 'github';
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors
        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'OAuth authentication failed');
          toast.error('Authentication failed');
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        // Validate required parameters
        if (!code || !state || !provider) {
          setStatus('error');
          setMessage('Invalid OAuth callback parameters');
          toast.error('Invalid authentication response');
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        // Handle OAuth callback
        setMessage('Completing authentication...');
        const authResponse = await AuthService.handleOAuthCallback(code, state, provider);
        
        setStatus('success');
        setMessage('Authentication successful! Redirecting...');
        toast.success(`Welcome, ${authResponse.user.name}!`);
        
        // Redirect to dashboard or return URL
        const returnUrl = sessionStorage.getItem('oauth_return_url') || '/dashboard';
        sessionStorage.removeItem('oauth_return_url');
        
        setTimeout(() => router.push(returnUrl), 2000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        const appError = handleError(error, { context: 'oauth-callback' });
        
        setStatus('error');
        setMessage(appError.message);
        toast.error('Authentication failed');
        
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, router, handleError]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 text-center">
          {/* Status Icon */}
          <div className="mb-6">
            {status === 'loading' && (
              <Spinner className="h-12 w-12 mx-auto text-cyan-400" />
            )}
            {status === 'success' && (
              <div className="w-12 h-12 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-12 h-12 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-4">
            {status === 'loading' && 'Authenticating...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authentication Failed'}
          </h1>

          {/* Message */}
          <p className="text-gray-300 mb-6">
            {message}
          </p>

          {/* Loading indicator for success/error states */}
          {status !== 'loading' && (
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
              <Spinner className="h-4 w-4" />
              <span>Redirecting...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
