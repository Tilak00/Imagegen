import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import imageReducer from './slices/imageSlice';
import uiReducer from './slices/uiSlice'; // Import the ui reducer

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    image: imageReducer,
    ui: uiReducer, // Add ui reducer to the store
  },
  // Optional: Add middleware like Redux Thunk (included by default) or others
  // middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
});

import { TypedUseSelectorHook, useDispatch as useReduxDispatch, useSelector as useReduxSelector } from 'react-redux';

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export typed hooks for usage in components
export const useDispatch: () => AppDispatch = useReduxDispatch;
export const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;