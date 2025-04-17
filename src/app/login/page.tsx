// src/app/login/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getLastPath, isProtectedPath } from '@/lib/utils/navigationUtils';
import { useDispatch, useSelector } from '@/lib/state/store'; // Use alias and remove .ts
import { signInWithPassword, signInWithGoogleProvider, clearAuthError } from '@/lib/state/slices/authSlice'; // Use alias and remove .ts
import type { RootState } from '@/lib/state/store'; // Use alias and remove .ts

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const dispatch = useDispatch();
  const router = useRouter();
  const { isLoading, error: authError, user } = useSelector((state: RootState) => state.auth);

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    dispatch(clearAuthError()); // Clear previous errors
    setValidationError(null); // Clear validation errors

    // Form validation
    if (!email && !password) {
      setValidationError('Please enter your email and password.');
      return;
    } else if (!email) {
      setValidationError('Please enter your email address.');
      return;
    } else if (!password) {
      setValidationError('Please enter your password.');
      return;
    } else if (!email.includes('@')) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    // If validation passes, attempt to sign in
    dispatch(signInWithPassword({ email, password }));
  };

  const handleGoogleSignIn = () => {
    dispatch(clearAuthError());
    dispatch(signInWithGoogleProvider());
    // OAuth redirect is handled by Supabase/authService
  };

  // Redirect if login is successful
  useEffect(() => {
    if (user) {
      console.log('User logged in, redirecting...');
      // Get the last path the user was on, or default to home
      const lastPath = getLastPath();
      // Only redirect to protected paths if we have a valid session
      const redirectPath = isProtectedPath(lastPath) ? lastPath : '/';
      console.log(`Redirecting to last path: ${redirectPath}`);
      router.push(redirectPath);
    }
  }, [user, router]);

  // Clear errors on component mount or when inputs change
  useEffect(() => {
    dispatch(clearAuthError());
    setValidationError(null);
  }, [dispatch, email, password]);


  return (
    <div className="flex min-h-screen items-center justify-center p-4 auth-gradient-background">
      {/* Added animate-fade-in and updated card styling */}
      <div className="w-full max-w-md space-y-6 rounded-xl bg-card p-8 shadow-2xl animate-fadeIn card-modern">
        <div className="text-center">
          {/* TODO: Replace with Logo component */}
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {'Log in to your account'.split('').map((letter, index) => (
              <span
                key={index}
                className="animate-letter"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {letter === ' ' ? '\u00A0' : letter}
              </span>
            ))}
          </h2>
        </div>

        {/* Error message display */}
        {(authError || validationError) && (
          <div className="rounded-md border border-red-400 bg-red-50 p-4 dark:bg-red-900/30 dark:border-red-600 animate-fadeIn">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{validationError || authError}</p>
              </div>
            </div>
          </div>
        )}

        <form className="space-y-6 animate-fadeIn delay-200" onSubmit={handleSignIn}>
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                // Applied form-input class
                className="form-input hover-lift"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
                disabled={isLoading}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                required
                 // Applied form-input class
                className="form-input pr-10 hover-lift" // Added padding-right for the icon button
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword((e.currentTarget as HTMLInputElement).value)}
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setPasswordVisible(!passwordVisible)}
                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              >
                {/* TODO: Replace with proper icon component (e.g., from react-icons) */}
                {passwordVisible ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L6.228 6.228" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              {/* TODO: Add Forgot Password functionality */}
              {/* Updated link style */}
              <a href="#" className="font-medium text-primary hover:underline">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              // Applied btn-primary class
              className="btn-primary btn-modern hover-lift"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {isLoading ? 'Logging in...' : 'Log in'}
            </button>
          </div>
        </form>

        <div className="relative mt-6 animate-fadeIn delay-300">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-card px-2 text-gray-500 dark:text-gray-400">Or continue with</span>
          </div>
        </div>

        <div className="mt-6 animate-fadeIn delay-400">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            // Applied btn-secondary class
            className="btn-secondary btn-modern hover-lift"
          >
            {/* TODO: Replace with proper Google icon component */}
            <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.5 512 0 401.5 0 265.2 0 129.2 110.5 18.2 244 18.2c67.9 0 124.3 27.8 167.4 72.4l-64.5 64.5C305.5 114.6 277.9 96.4 244 96.4c-70.7 0-128.2 57.5-128.2 128.2s57.5 128.2 128.2 128.2c80.3 0 110.1-61.5 113.9-93.1H244v-83.8h235.9c4.7 27.4 7.1 55.1 7.1 84.3z"></path></svg>
            Sign in with Google
          </button>
          {/* Add Apple button if needed */}
        </div>

        <div className="mt-6 text-center animate-fadeIn delay-500">
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Don't have an account?
          </p>
          <Link href="/signup" className="inline-block">
            <button className="btn-secondary btn-modern hover-lift px-6 py-2">
              Sign Up
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}