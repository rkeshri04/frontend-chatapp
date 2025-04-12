import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import axios from 'axios';
import { Platform } from 'react-native';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8000';

interface AuthState {
  user: any | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    console.log('Attempting login for:', email);
    console.log('API URL:', API_URL);   
    try {
      console.log('Making API request to:', `${API_URL}/auth/login`);
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      
      console.log('Login response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
      // Handle the nested response structure from the backend
      const responseData = response.data;
      
      // Extract token and user from the nested structure
      const token = responseData.access_token.access_token;
      const user = responseData.access_token.user;
      
      console.log('Extracted token and user:', { token: '***', user });
      
      if (!token || !user) {
        return rejectWithValue('Login failed: Invalid response format from server');
      }
      
      // Store token in secure storage
      await SecureStore.setItemAsync('token', token);
      
      // Store user data in secure storage as JSON string
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      
      return { 
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          default_language: user.default_language
        }, 
        token: token 
      };
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (axios.isAxiosError(error)) {
        // Log the full axios error
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
          }
        });
        
        if (error.response) {
          // Server responded with a status code outside of 2xx range
          console.error('Server error response:', error.response.data);
          return rejectWithValue(error.response.data.detail || 'Login failed: Server error');
        } else if (error.request) {
          // Request was made but no response received
          console.error('No response received from server');
          return rejectWithValue('Login failed: No response from server');
        }
      }
      
      // Fallback for non-axios errors
      console.error('Non-axios error:', error);
      return rejectWithValue(`Login failed: ${error.message || 'Network error'}`);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Remove token from secure storage
      await SecureStore.deleteItemAsync('token');
      return true;
    } catch (error) {
      return rejectWithValue('Logout failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password, name }: { email: string; password: string; name: string }, 
    { rejectWithValue }) => {
    try {
      // Here we'd normally make an API call to a backend
      // Simulating a successful registration for now
      if (email && password && name) {
        const user = { id: '1', email, name };
        const token = 'sample-token-123';
        
        // Store token in secure storage
        await SecureStore.setItemAsync('token', token);
        
        return { user, token };
      }
      return rejectWithValue('Invalid registration data');
    } catch (error) {
      return rejectWithValue('Registration failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: any; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Logout cases
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
      })
      // Register cases
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;

export default authSlice.reducer;
