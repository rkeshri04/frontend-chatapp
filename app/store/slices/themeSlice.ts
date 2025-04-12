import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// We'll use SecureStore as a fallback which is already in your project
// This provides better error handling if AsyncStorage isn't installed yet

interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  isLoading: boolean;
}

const initialState: ThemeState = {
  mode: 'system',  // Default to system preference
  isLoading: true,
};

// Helper function to store theme data based on platform
const storeThemeData = async (key: string, value: string) => {
  try {
    if (Platform.OS === 'web') {
      // For web, use localStorage
      localStorage.setItem(key, value);
    } else {
      // For native platforms, use SecureStore
      await SecureStore.setItemAsync(key, value);
    }
    return true;
  } catch (error) {
    console.error('Error storing theme data:', error);
    return false;
  }
};

// Helper function to retrieve theme data based on platform
const getThemeData = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      // For web, use localStorage
      return localStorage.getItem(key);
    } else {
      // For native platforms, use SecureStore
      return await SecureStore.getItemAsync(key);
    }
  } catch (error) {
    console.error('Error retrieving theme data:', error);
    return null;
  }
};

// Initialize theme from storage
export const initializeTheme = createAsyncThunk(
  'theme/initialize',
  async () => {
    try {
      const savedTheme = await getThemeData('themeMode');
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        return savedTheme as 'light' | 'dark' | 'system';
      }
      return 'system';
    } catch (error) {
      console.error('Error loading theme:', error);
      return 'system';
    }
  }
);

// Save theme to storage
export const saveTheme = createAsyncThunk(
  'theme/save',
  async (mode: 'light' | 'dark' | 'system') => {
    try {
      await storeThemeData('themeMode', mode);
      return mode;
    } catch (error) {
      console.error('Error saving theme:', error);
      return mode; // Still return the mode even if saving failed
    }
  }
);

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.mode = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeTheme.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeTheme.fulfilled, (state, action) => {
        state.mode = action.payload;
        state.isLoading = false;
      })
      .addCase(saveTheme.fulfilled, (state, action) => {
        state.mode = action.payload;
      });
  },
});

export const { setThemeMode } = themeSlice.actions;

export default themeSlice.reducer;
