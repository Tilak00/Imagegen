import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { imageRepository } from '../../repositories/imageRepository'; // Relative path
import { imageService } from '../../services/imageService'; // Relative path
import { TransformImageParams, TransformationResult } from '../../models/transformationModel'; // Relative path
import { supabase } from '../../supabaseClient'; // Relative path

// Define and export the structure for a single transformation record from DB
export interface TransformationRecord {
  id: string;
  user_id: string;
  original_url: string; // Should be empty for text-to-image
  transformed_url: string;
  prompt: string;
  created_at: string; // Assuming string timestamp from DB
}
// Define Keyframe type based on expected Supabase function response
export interface Keyframe {
  angle: string;
  url: string;
}

interface ImageState {
  // Image Generation State
  currentTransformation: TransformationResult | null;
  history: TransformationRecord[];
  isLoading: boolean; // Combined loading state for now, or split later
  error: string | null; // Combined error state

  // Video Generation State
  videoId: string | null;
  videoKeyframes: Keyframe[] | null;
  isVideoLoading: boolean; // Specific loading for video
  videoError: string | null; // Specific error for video
}

const initialState: ImageState = {
  // Image state
  currentTransformation: null,
  history: [],
  isLoading: false, // General loading (e.g., history fetch)
  error: null, // General error
  // Video state
  videoId: null,
  videoKeyframes: null,
  isVideoLoading: false,
  videoError: null,
};

// Async thunk to fetch transformation history
export const fetchTransformationHistory = createAsyncThunk(
  'image/fetchHistory',
  async (userId: string, { rejectWithValue }) => {
    try {
      // Use any[] for now, map later if needed or define TransformationRecord better
      const historyData: any[] = await imageRepository.getTransformations(userId);
      // TODO: Map data to TransformationRecord[] if necessary, ensure types match DB
      return historyData as TransformationRecord[];
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch transformation history');
    }
  }
);

// Async thunk to create a new transformation (now text-to-image)
export const createTransformation = createAsyncThunk(
  'image/createTransformation',
  async (params: TransformImageParams, { rejectWithValue }) => { // Params no longer includes imagePath
    try {
      const result = await imageService.transformImage(params); // Calls the adapted service
      return result; // Contains transformationId, transformedUrl
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to create transformation');
    }
  }
);

// Async thunk for video generation (enhance + generate)
export const generateVideoAndKeyframes = createAsyncThunk(
  'image/generateVideo',
  async ({ prompt, videoDetails }: { prompt: string; videoDetails?: string }, { rejectWithValue }) => {
    try {
      console.log('Thunk: Enhancing prompt...');
      const { data: enhanceData, error: enhanceError } = await supabase.functions.invoke(
        'enhance-prompt',
        { body: { prompt } } // Assuming function expects 'prompt'
      );
      if (enhanceError) throw new Error(`Enhance prompt failed: ${enhanceError.message}`);
      if (!enhanceData?.enhancedPrompt) throw new Error('Enhanced prompt not received.');
      const enhancedPrompt = enhanceData.enhancedPrompt;
      console.log('Thunk: Enhanced Prompt:', enhancedPrompt);

      console.log('Thunk: Generating video...');
      const { data: videoData, error: videoError } = await supabase.functions.invoke(
        'generate-video',
        // Ensure body matches the expected structure of the 'generate-video' function
        { body: { prompt: enhancedPrompt, video_details: videoDetails || '' } }
      );
      if (videoError) throw new Error(`Generate video failed: ${videoError.message}`);

      // Assuming the function returns { video_id: string, keyframes: Keyframe[] }
      if (!videoData?.video_id || !Array.isArray(videoData?.keyframes)) {
         console.error("Invalid response structure from generate-video:", videoData);
         throw new Error('Invalid response from video generation function.');
      }
      console.log('Thunk: Video generation successful:', videoData.video_id);
      return { videoId: videoData.video_id, keyframes: videoData.keyframes as Keyframe[] };

    } catch (err: any) {
      console.error("Thunk: generateVideoAndKeyframes error:", err);
      return rejectWithValue(err.message || 'Failed to generate video');
    }
  }
);

const imageSlice = createSlice({
  name: 'image',
  initialState,
  reducers: {
    clearImageState: (state) => { // Clear both image and video state
      state.currentTransformation = null;
      state.history = [];
      state.isLoading = false;
      state.error = null;
      state.videoId = null;
      state.videoKeyframes = null;
      state.isVideoLoading = false;
      state.videoError = null;
    },
    clearImageError: (state) => { // Clear general error
        state.error = null;
    },
    clearVideoError: (state) => { // Specific action to clear video error
        state.videoError = null;
    },
    // Add reducer to clear current video results if needed after viewing
    clearCurrentVideo: (state) => {
        state.videoId = null;
        state.videoKeyframes = null;
    }
    // Add other reducers if needed
  },
  extraReducers: (builder) => {
    builder
      // fetchTransformationHistory
      .addCase(fetchTransformationHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransformationHistory.fulfilled, (state, action: PayloadAction<TransformationRecord[]>) => {
        state.history = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchTransformationHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // createTransformation
      .addCase(createTransformation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.currentTransformation = null; // Clear previous result
      })
      .addCase(createTransformation.fulfilled, (state, action: PayloadAction<TransformationResult>) => {
        state.currentTransformation = action.payload;
        state.isLoading = false;
        // Optionally add the new transformation to the history state immediately
        // This requires getting the prompt back or storing it temporarily
        // For now, history will be updated on next fetch
      })
      .addCase(createTransformation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.currentTransformation = null;
      })
      // generateVideoAndKeyframes
      .addCase(generateVideoAndKeyframes.pending, (state) => {
        state.isVideoLoading = true;
        state.videoError = null;
        state.videoId = null;
        state.videoKeyframes = null;
        // Optionally set general isLoading too if UI combines indicators
        // state.isLoading = true;
      })
      .addCase(generateVideoAndKeyframes.fulfilled, (state, action: PayloadAction<{ videoId: string; keyframes: Keyframe[] }>) => {
        state.videoId = action.payload.videoId;
        state.videoKeyframes = action.payload.keyframes;
        state.isVideoLoading = false;
        // state.isLoading = false;
      })
      .addCase(generateVideoAndKeyframes.rejected, (state, action) => {
        state.isVideoLoading = false;
        state.videoError = action.payload as string;
        // state.isLoading = false;
      });
  },
});

export const { clearImageState, clearImageError, clearVideoError, clearCurrentVideo } = imageSlice.actions;
export default imageSlice.reducer;