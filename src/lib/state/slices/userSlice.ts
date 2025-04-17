import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { userRepository } from '../../repositories/userRepository.ts'; // Relative path
// Assuming UserProfileData is the shape returned by the repository
import { UserProfileData } from '../../repositories/userRepository.ts'; // Relative path

interface UserState {
  profile: UserProfileData | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  isLoading: false,
  error: null,
};

// Async thunk to fetch user profile
export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      const profile = await userRepository.getUserProfile(userId);
      if (!profile) {
        // Handle case where profile might not exist yet after signup
        console.warn(`No profile found in DB for user ${userId}. May need creation.`);
        // Return null or a default profile structure? Returning null for now.
        return null;
      }
      return profile;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch user profile');
    }
  }
);

// Async thunk to update user profile
export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  // Update the 'updates' type to include first_name and last_name
  async ({ userId, updates }: { userId: string; updates: Partial<Pick<UserProfileData, 'first_name' | 'last_name' | 'avatar_url'>> }, { rejectWithValue }) => {
    try {
      const updatedProfile = await userRepository.updateUserProfile(userId, updates);
      if (!updatedProfile) {
          throw new Error("Profile update failed or returned no data.");
      }
      return updatedProfile;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to update user profile');
    }
  }
);


const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Reducer to clear profile data (e.g., on sign out)
    clearUserProfile: (state) => {
      state.profile = null;
      state.isLoading = false;
      state.error = null;
    },
    clearUserError: (state) => {
        state.error = null;
    },
    // Reducer to update profile directly from Realtime subscription
    setProfileFromRealtime: (state, action: PayloadAction<UserProfileData>) => {
        // Only update if the incoming data is different to avoid unnecessary re-renders
        // Note: This is a shallow comparison. For deep objects, a deep comparison library might be needed.
        if (JSON.stringify(state.profile) !== JSON.stringify(action.payload)) {
            console.log("Realtime update received for user profile:", action.payload);
            state.profile = action.payload;
            state.isLoading = false; // Ensure loading is false
            state.error = null; // Clear any previous errors
        }
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchUserProfile
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action: PayloadAction<UserProfileData | null>) => {
        state.profile = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // updateUserProfile
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true; // Indicate loading during update
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action: PayloadAction<UserProfileData>) => {
        state.profile = action.payload; // Update profile with returned data
        state.isLoading = false;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearUserProfile, clearUserError, setProfileFromRealtime } = userSlice.actions;
export default userSlice.reducer;