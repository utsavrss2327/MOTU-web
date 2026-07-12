'use client';

import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Loader2, LogIn } from 'lucide-react';

export default function LoginScreen() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        // Fetch user profile
        const res = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });
        
        if (!res.ok) throw new Error('Failed to fetch user profile');
        
        const profile = await res.json();
        
        login(tokenResponse.access_token, {
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
        });
      } catch (err) {
        console.error(err);
        setError('Failed to fetch Google profile. Please try again.');
        setIsLoading(false);
      }
    },
    onError: () => {
      setError('Authentication failed. Please check your Google Client ID configuration.');
      setIsLoading(false);
    },
    // Request access to drive files created by this app + basic profile info
    scope: 'https://www.googleapis.com/auth/drive.file profile email',
  });

  return (
    <div className="flex h-[100dvh] w-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 text-center relative overflow-hidden">
        
        {/* Decorative background blurs */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="mx-auto w-16 h-16 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <Sparkles size={32} />
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Welcome to MOTU</h1>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-2 tracking-wide">
            <span className="text-orange-600 dark:text-orange-400 font-extrabold text-base">M</span>ap <span className="text-orange-600 dark:text-orange-400 font-extrabold text-base">O</span>f <span className="text-orange-600 dark:text-orange-400 font-extrabold text-base">T</span>houghts & <span className="text-orange-600 dark:text-orange-400 font-extrabold text-base">U</span>nified-notes
          </p>
          <p className="text-zinc-500 dark:text-zinc-400 mb-10">
            Sign in to start creating notes and syncing them directly to your Google Drive.
          </p>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-500/20 text-left">
              <strong>Error:</strong> {error}
            </div>
          )}

          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              googleLogin();
              // In case the popup gets blocked or closed instantly
              setTimeout(() => setIsLoading(false), 1000);
            }}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-medium transition-all shadow-lg active:scale-[0.98] disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </>
            )}
          </button>
          
          <p className="mt-6 text-xs text-zinc-400 dark:text-zinc-500">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
