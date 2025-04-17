import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Session } from '@supabase/supabase-js';
import { User } from '../../models/userModel'; // Relative path
import { authRepository } from '../../repositories/authRepository'; // Relative path
import { authService } from '../../services/supabase/authService'; // Relative path
// Need to import supabase client directly for thunks needing getSession
import { supabase } from '../../supabaseClient'; // Relative path
import { RootState } from '../store'; // Import RootState
interface AuthState {
  session: Session | null; // Keep session for potential direct use if needed
  user: User | null; // Store user model data
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  session: null,
  user: null,
  isLoading: true, // Start loading initially to check session
  error: null,
};

// Async thunk to check the initial session state
export const checkInitialSession = createAsyncThunk(
  'auth/checkInitialSession',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authRepository.getCurrentUser();
      // Fetch session separately if needed, or derive from user presence
      const { data: sessionData } = await supabase.auth.getSession(); // Assuming supabase is accessible or passed
      return { user, session: sessionData.session };
    } catch (err: any) {
      console.error("Exception fetching initial session:", err.message);
      return rejectWithValue(err.message || 'Failed to fetch initial session');
    }
  }
);

// Async thunk for signing in
export const signInWithPassword = createAsyncThunk(
  'auth/signInWithPassword',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const user = await authRepository.signIn(email, password);
      const { data: sessionData } = await supabase.auth.getSession(); // Get session after login
      return { user, session: sessionData.session };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Sign in failed');
    }
  }
);

// Async thunk for Google Sign In
export const signInWithGoogleProvider = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      await authService.signInWithGoogle();
      // Session update handled by listener
      return null;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to initiate Google sign-in');
    }
  }
);

// Async thunk for signing up - accepts credentials object
export const signUpWithPassword = createAsyncThunk(
  'auth/signUpWithPassword',
  async (credentials: { email: string; password: string; options?: { data?: object } }, { rejectWithValue }) => {
    try {
      await authRepository.signUp(credentials);
      // Session update handled by listener (or potentially after email confirmation)
      return null;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Sign up failed');
    }
  }
);

// Async thunk for signing out
export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      // The authService.signOut method already checks for an active session
      await authRepository.signOut();
      return null;
    } catch (err: any) {
      console.error("AuthSlice: Sign out error:", err.message);
      // Even if sign out fails, we should clear the Redux state
      return rejectWithValue(err.message || 'Sign out failed');
    }
  }
);


const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Reducer to manually set user and session (e.g., from auth state listener)
    setAuth: (state, action: PayloadAction<{ user: User | null; session: Session | null }>) => {
      state.user = action.payload.user;
      state.session = action.payload.session;
      state.isLoading = false; // Listener provides definitive state
      state.error = null;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
        state.isLoading = action.payload;
    },
    clearAuthError: (state) => {
        state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // checkInitialSession
      .addCase(checkInitialSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkInitialSession.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.isLoading = false;
      })
      .addCase(checkInitialSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.user = null; // Ensure user/session are null on failure
        state.session = null;
      })
      // signInWithGoogleProvider
      .addCase(signInWithGoogleProvider.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithGoogleProvider.fulfilled, (state) => {
        // Don't set user/session here, listener handles it
        state.isLoading = false; // Or keep true until listener confirms? Let's set false.
      })
      .addCase(signInWithGoogleProvider.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.user = null;
        state.session = null;
      })
      // signInWithPassword
      .addCase(signInWithPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithPassword.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.isLoading = false;
      })
      .addCase(signInWithPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.user = null; // Clear user/session on login failure
        state.session = null;
      })
      // signUpWithPassword
      .addCase(signUpWithPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUpWithPassword.fulfilled, (state) => {
        // No state change needed here, listener handles it (or email confirmation flow starts)
        state.isLoading = false;
      })
      .addCase(signUpWithPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // signOut
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.session = null;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        // Keep user/session on sign-out failure? Let's clear.
        state.user = null;
        state.session = null;
      });
  },
});


export const { setAuth, setAuthLoading, clearAuthError } = authSlice.actions;
export default authSlice.reducer;

// Selector
export const selectAuthSession = (state: RootState) => state.auth.session;