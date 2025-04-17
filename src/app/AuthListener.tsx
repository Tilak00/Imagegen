// src/app/AuthListener.tsx
'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from '@/lib/state/store'; // Import useSelector
import { setAuth, setAuthLoading, selectAuthSession } from '@/lib/state/slices/authSlice'; // Import selector
import { clearUserProfile, fetchUserProfile } from '@/lib/state/slices/userSlice';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@/lib/models/userModel';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { saveCurrentPath, getLastPath, isProtectedPath } from '@/lib/utils/navigationUtils';

export default function AuthListener() {
  console.log('[AuthListener] Component rendering');
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const session = useSelector(selectAuthSession); // Get session from Redux state
  const { isLoading: isAuthLoading } = useSelector((state) => state.auth);

  // Effect for setting up listener and initial check (runs once on mount)
  useEffect(() => {
    console.log('[AuthListener] Mount Effect: Setting up listener and initial check...');
    dispatch(setAuthLoading(true));

    // Function to handle auth state updates (without redirect logic)
    const handleAuthStateUpdate = async (newSession: Session | null) => {
      const userModel: User | null = newSession?.user ? {
          id: newSession.user.id,
          email: newSession.user.email!,
          createdAt: newSession.user.created_at!,
      } : null;
      console.log('[AuthListener] Auth state updated in Redux:', newSession ? 'Session found' : 'No session');
      dispatch(setAuth({ session: newSession, user: userModel }));
      if (userModel) {
          console.log('[AuthListener] Fetching profile for user:', userModel.id);
          dispatch(fetchUserProfile(userModel.id));
      } else {
          console.log('[AuthListener] Clearing user profile.');
          dispatch(clearUserProfile());
      }
    };

    // 1. Initial session check
    supabase.auth.getSession()
      .then(async ({ data }) => {
        console.log('[AuthListener] Initial session check complete.');
        try {
          await handleAuthStateUpdate(data.session);
        } catch (error) {
          console.error("[AuthListener] Error during initial handleAuthStateUpdate:", error);
        } finally {
          console.log('[AuthListener] Dispatching setAuthLoading(false) after initial getSession.');
          dispatch(setAuthLoading(false)); // Stop loading ONLY after initial check
        }
      })
      .catch((error) => {
        console.error("[AuthListener] Error fetching initial session:", error);
        // Check if this is a refresh token error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Invalid Refresh Token') || errorMessage.includes('Refresh Token Not Found')) {
          console.log('[AuthListener] Refresh token error detected, clearing auth state');
          // Clear any stale auth state
          supabase.auth.signOut().catch(e => console.error('[AuthListener] Error during forced signOut:', e));
        }
        dispatch(setAuth({ session: null, user: null })); // Assume logged out
        dispatch(setAuthLoading(false));
      });

    // 2. Set up the listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => { // Make listener async
        console.log('[AuthListener] onAuthStateChange event:', event);

        try {
          // Update state based on the event
          if (event === 'SIGNED_OUT') {
            console.log('[AuthListener] User signed out');
            // Clear auth state
            dispatch(setAuth({ session: null, user: null }));
            dispatch(clearUserProfile());
          } else {
            await handleAuthStateUpdate(session);
          }
          // Loading state is not managed here anymore for subsequent changes
        } catch (error) {
          console.error('[AuthListener] Error in onAuthStateChange handler:', error);
          // Ensure loading is set to false in case of errors
          dispatch(setAuthLoading(false));
        }
      }
    );

    // Cleanup listener on component unmount
    return () => {
      console.log('[AuthListener] Unmount Effect: Cleaning up listener...');
      subscription?.unsubscribe();
    };
  }, [dispatch]); // Runs only once on mount

  // Save current path to localStorage whenever it changes
  useEffect(() => {
    if (pathname) {
      saveCurrentPath(pathname);
    }
  }, [pathname]);

  // Effect for handling redirects based on session and pathname
  useEffect(() => {
    console.log(`[AuthListener] Redirect Effect: Checking navigation. Session: ${!!session}, Path: ${pathname}`);

    // Only handle redirects after auth state is loaded (not during initial load)
    if (!isAuthLoading) {
      if (!session && isProtectedPath(pathname)) {
        console.log(`[AuthListener] Redirect Effect: No session on protected path (${pathname}). Redirecting to /login.`);
        router.push('/login');
      } else if (session && (pathname === '/login' || pathname === '/signup')) {
        // If user is logged in and on login/signup page, redirect to last path or default
        const lastPath = getLastPath();
        const redirectPath = isProtectedPath(lastPath) ? lastPath : '/generate';
        console.log(`[AuthListener] Redirect Effect: Session found on auth page (${pathname}). Redirecting to ${redirectPath}.`);
        router.push(redirectPath);
      }
    }
    // No action needed if session exists on non-auth page, or no session on public page
  }, [session, pathname, router, isAuthLoading]); // Added isAuthLoading dependency

  // This component does not render anything itself
  return null;
}