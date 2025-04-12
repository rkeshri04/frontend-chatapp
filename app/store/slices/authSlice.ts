import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import axios from 'axios';
import { Platform } from 'react-native';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8000';

// Session constants
const SESSION_EXPIRE_TIME = 59 * 60 * 1000; // 59 minutes in milliseconds
const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes in milliseconds

interface AuthState {
  user: any | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  sessionExpiryTime: number | null;
  lastActivityTime: number | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  sessionExpiryTime: null,
  lastActivityTime: null,
};

// Initialize auth state from secure storage - fix token handling
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { dispatch }) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const userJson = await SecureStore.getItemAsync('user');
      const sessionExpiryTimeStr = await SecureStore.getItemAsync('sessionExpiryTime');
      const lastActivityTimeStr = await SecureStore.getItemAsync('lastActivityTime');
      
      if (token && userJson) {
        console.log('Found stored token and user data');
        const user = JSON.parse(userJson);
        const sessionExpiryTime = sessionExpiryTimeStr ? parseInt(sessionExpiryTimeStr) : null;
        const lastActivityTime = lastActivityTimeStr ? parseInt(lastActivityTimeStr) : null;
        
        const now = Date.now();
        
        // Check if session has expired, but don't log out automatically - just return auth data
        // and let the component handle expiry
        if (sessionExpiryTime && now > sessionExpiryTime) {
          console.log('Session expiry time has passed, but returning data for component handling');
        }
        
        // Check for inactivity timeout, but don't log out automatically
        if (lastActivityTime && now - lastActivityTime > INACTIVITY_TIMEOUT) {
          console.log('Inactivity threshold reached, but returning data for component handling');
        }
        
        // Update activity time
        dispatch(updateActivity());
        
        return { 
          user, 
          token,
          sessionExpiryTime,
          lastActivityTime
        };
      }
      return null;
    } catch (error) {
      console.error('Error initializing auth:', error);
      return null;
    }
  }
);

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
      console.log('Response data structure:', Object.keys(response.data));
      
      // Extract token and user from the nested structure
      let token, user;
      
      // Handle different possible response structures
      if (response.data.access_token) {
        if (typeof response.data.access_token === 'string') {
          token = response.data.access_token;
          user = response.data.user;
        } else if (response.data.access_token.access_token) {
          token = response.data.access_token.access_token;
          user = response.data.access_token.user;
        }
      } else if (response.data.token) {
        token = response.data.token;
        user = response.data.user;
      }
      
      if (!token || !user) {
        console.error('Could not extract token or user from response:', 
                     JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
        return rejectWithValue('Login failed: Invalid response format from server');
      }
      
      console.log('Extracted token type:', typeof token, 'length:', token.length);
      console.log('User data available:', Object.keys(user));
      
      // Calculate session expiry time (59 minutes from now)
      const sessionExpiryTime = Date.now() + SESSION_EXPIRE_TIME;
      const lastActivityTime = Date.now();
      
      // Store token in secure storage WITHOUT modifying it - preserve original format
      await SecureStore.setItemAsync('token', token);
      console.log('Token stored in SecureStore');
      
      // Store user data in secure storage as JSON string
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      
      // Store session expiry time
      await SecureStore.setItemAsync('sessionExpiryTime', sessionExpiryTime.toString());
      
      // Store last activity time
      await SecureStore.setItemAsync('lastActivityTime', lastActivityTime.toString());
      
      return { 
        user,
        token,
        sessionExpiryTime,
        lastActivityTime
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
          // Return the exact error message from the server for better user feedback
          return rejectWithValue(
            error.response.data.detail || 
            error.response.data.message || 
            'Login failed: Invalid credentials'
          );
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
      // Remove all auth-related items from secure storage
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('sessionExpiryTime');
      await SecureStore.deleteItemAsync('lastActivityTime');
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
        
        // Calculate session expiry time (59 minutes from now)
        const sessionExpiryTime = Date.now() + SESSION_EXPIRE_TIME;
        const lastActivityTime = Date.now();
        
        // Store token in secure storage
        await SecureStore.setItemAsync('token', token);
        
        // Store user data
        await SecureStore.setItemAsync('user', JSON.stringify(user));
        
        // Store session expiry time
        await SecureStore.setItemAsync('sessionExpiryTime', sessionExpiryTime.toString());
        
        // Store last activity time
        await SecureStore.setItemAsync('lastActivityTime', lastActivityTime.toString());
        
        return { 
          user, 
          token,
          sessionExpiryTime,
          lastActivityTime
        };
      }
      return rejectWithValue('Invalid registration data');
    } catch (error) {
      return rejectWithValue('Registration failed');
    }
  }
);

// Action to update the last activity time
export const updateActivity = createAsyncThunk(
  'auth/updateActivity',
  async (_, { getState }) => {
    try {
      const state = getState() as { auth: AuthState };
      
      if (state.auth.token) {
        const lastActivityTime = Date.now();
        await SecureStore.setItemAsync('lastActivityTime', lastActivityTime.toString());
        return lastActivityTime;
      }
      return null;
    } catch (error) {
      console.error('Error updating activity time:', error);
      return null;
    }
  }
);

// Action to check and handle session expiry
export const checkSessionExpiry = createAsyncThunk(
  'auth/checkSessionExpiry',
  async (_, { getState, dispatch }) => {
    try {
      const state = getState() as { auth: AuthState };
      
      if (state.auth.token && state.auth.sessionExpiryTime) {
        const now = Date.now();
        
        // Check if session has expired
        if (now > state.auth.sessionExpiryTime) {
          console.log('Session expired, logging out');
          dispatch(logout());
          return true;
        }
        
        // Check for inactivity
        if (state.auth.lastActivityTime && now - state.auth.lastActivityTime > INACTIVITY_TIMEOUT) {
          console.log('User inactive, logging out');
          dispatch(logout());
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking session expiry:', error);
      return false;
    }
  }
);

// Action to validate token with the backend
export const validateToken = createAsyncThunk(
  'auth/validateToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      
      if (!state.auth.token) {
        return rejectWithValue('No token found');
      }
      
      // Log the token being used (just the first few characters for security)
      const tokenPreview = state.auth.token.substring(0, 10) + '...';
      console.log('Validating token:', tokenPreview);
      
      // Make a request to a protected endpoint to validate token
      const response = await axios.get(`${API_URL}/auth/validate`, {
        headers: {
          Authorization: `Bearer ${state.auth.token}`
        }
      });
      
      console.log('Token validation response:', response.status);
      
      // If successful, return true
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // If unauthorized, the token is invalid
        console.log('Token is invalid or expired');
        return rejectWithValue('Token expired');
      }
      
      return rejectWithValue('Failed to validate token');
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
      state.sessionExpiryTime = null;
      state.lastActivityTime = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize auth
      .addCase(initializeAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.sessionExpiryTime = action.payload.sessionExpiryTime;
          state.lastActivityTime = action.payload.lastActivityTime;
        }
      })
      // Login cases
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.sessionExpiryTime = action.payload.sessionExpiryTime;
        state.lastActivityTime = action.payload.lastActivityTime;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Logout cases
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.sessionExpiryTime = null;
        state.lastActivityTime = null;
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
        state.sessionExpiryTime = action.payload.sessionExpiryTime;
        state.lastActivityTime = action.payload.lastActivityTime;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update activity
      .addCase(updateActivity.fulfilled, (state, action) => {
        if (action.payload) {
          state.lastActivityTime = action.payload;
        }
      })
      // Handle token validation
      .addCase(validateToken.rejected, (state) => {
        // If token validation fails, clear credentials
        state.user = null;
        state.token = null;
        state.sessionExpiryTime = null;
        state.lastActivityTime = null;
      });
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;

export default authSlice.reducer;
