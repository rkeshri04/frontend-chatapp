import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import Constants from 'expo-constants';
import { RootState } from '../store'; // Adjust path if necessary

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8000';

interface UserSearchResult {
  id: string;
  username: string;
  email: string;
  conversation_exists?: boolean; // Add optional field based on response
  conversation_id?: string; // Add conversation_id field
  // Add other relevant user fields if needed
}

interface SearchState {
  results: UserSearchResult[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SearchState = {
  results: [],
  isLoading: false,
  error: null,
};

// Helper to get auth headers (similar to chatSlice)
const getAuthHeaders = (getState: () => RootState): Record<string, string> => {
  const token = getState().auth.token;
  if (!token) {
    throw new Error('Authentication token not found.');
  }
  return {
    Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Async thunk to search for users
export const searchUsers = createAsyncThunk<
  UserSearchResult[], // Return type on success (still an array)
  string, // Argument type (search identifier)
  { rejectValue: string; state: RootState } // ThunkApiConfig
>(
  'search/searchUsers',
  async (identifier, { rejectWithValue, getState }) => {
    if (!identifier.trim()) {
      return rejectWithValue('Search term cannot be empty.');
    }
    try {
      const headers = getAuthHeaders(getState);
      console.log(`Searching users with identifier: ${identifier}`);
      const response = await axios.get(
        `${API_URL}/auth/search?identifier=${encodeURIComponent(identifier.trim())}`,
        { headers }
      );

      console.log('Search response status:', response.status);
      console.log('Search response data:', response.data);

      // Check if the response data is an object with an 'id' (indicating a user was found)
      if (response.data && typeof response.data === 'object' && response.data.id) {
        // Ensure conversation_id is included if it exists in the response
        const result: UserSearchResult = {
          id: response.data.id,
          username: response.data.username,
          email: response.data.email,
          conversation_exists: response.data.conversation_exists,
          conversation_id: response.data.conversation_id, // Capture conversation_id
        };
        return [result];
      } else if (response.status === 200 && (!response.data || !response.data.id)) {
        // Handle cases where backend returns 200 but no valid user data (treat as not found)
        console.log('Search returned 200 but no valid user data found.');
        return rejectWithValue('No users found.');
      } else {
        // This case might not be reached if the backend always returns an object or 404/error
        console.error('Unexpected search response format:', response.data);
        return rejectWithValue('Unexpected response format from server.');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const errorMsg = error.response.data?.detail || error.response.data?.message || `Server error: ${error.response.status}`;
          // Treat 404 specifically as "No users found"
          if (error.response.status === 404) {
            return rejectWithValue('No users found.');
          }
          return rejectWithValue(errorMsg);
        } else if (error.request) {
          return rejectWithValue('Network error: No response from server.');
        }
      }
      return rejectWithValue('An unexpected error occurred during search.');
    }
  }
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    clearSearchResults: (state) => {
      state.results = [];
      state.error = null;
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.results = []; // Clear previous results on new search
      })
      .addCase(searchUsers.fulfilled, (state, action: PayloadAction<UserSearchResult[]>) => {
        state.isLoading = false;
        state.results = action.payload;
        state.error = null;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Search failed.'; // Use the rejected value as error message
        state.results = [];
      });
  },
});

export const { clearSearchResults } = searchSlice.actions;

export default searchSlice.reducer;
