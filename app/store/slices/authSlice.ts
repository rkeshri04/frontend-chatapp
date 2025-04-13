import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import axios from 'axios';
import { Platform } from 'react-native';
import { logAuth, logAuthError } from '../../../utils/authLogger';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8000';

// Session constants
const SESSION_EXPIRE_TIME = (59 * 60 + 59) * 1000; // 59 minutes and 59 seconds in milliseconds
const EXPIRY_WARNING_TIME = 30 * 1000; // 30 seconds before expiry

// Test values for debugging
// const SESSION_EXPIRE_TIME = 7 * 1000; // 10 seconds for testing
// const EXPIRY_WARNING_TIME = 3 * 1000; // 5 seconds for testing

interface AuthState {
  user: any | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  sessionExpiryTime: number | null;
  showExpiryWarning: boolean; 
  initialized: boolean; // Track whether auth has been initialized
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  sessionExpiryTime: null,
  showExpiryWarning: false,
  initialized: false,
};

// Initialize auth state from secure storage - fix token handling
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { dispatch }) => {
    try {
      logAuth('Fetching auth data from secure storage');
      const token = await SecureStore.getItemAsync('token');
      const userJson = await SecureStore.getItemAsync('user');
      const sessionExpiryTimeStr = await SecureStore.getItemAsync('sessionExpiryTime');
      
      if (token && userJson) {
        logAuth('Found stored token and user data', { tokenLength: token.length });
        try {
          const user = JSON.parse(userJson);
          const sessionExpiryTime = sessionExpiryTimeStr ? parseInt(sessionExpiryTimeStr) : null;
          
          const now = Date.now();
          
          // Check if session has expired
          if (sessionExpiryTime && now > sessionExpiryTime) {
            logAuth('Session has expired, but returning data for component handling', {
              expired: true,
              expiryTime: new Date(sessionExpiryTime).toISOString()
            });
          }
          
          // Start the session expiry check
          dispatch(startSessionExpiryCheck());
          
          return { 
            user, 
            token,
            sessionExpiryTime,
          };
        } catch (error) {
          logAuthError('Error parsing stored user data', error);
          return null;
        }
      }
      logAuth('No stored auth data found');
      return null;
    } catch (error) {
      logAuthError('Error initializing auth', error);
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
      
      // Store token in secure storage WITHOUT modifying it - preserve original format
      await SecureStore.setItemAsync('token', token);
      console.log('Token stored in SecureStore');
      
      // Store user data in secure storage as JSON string
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      
      // Store session expiry time
      await SecureStore.setItemAsync('sessionExpiryTime', sessionExpiryTime.toString());
      
      return { 
        user,
        token,
        sessionExpiryTime,
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

// Define logout with specific handling to ensure tokens are completely removed
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      logAuth('Logging out, clearing secure storage');
      
      // Remove all auth-related items from secure storage
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('sessionExpiryTime');
      
      // On iOS, make sure SecureStore is completely updated
      if (Platform.OS === 'ios') {
        // Verify deletion was successful
        const tokenCheck = await SecureStore.getItemAsync('token');
        if (tokenCheck) {
          logAuthError('Failed to delete token from SecureStore', { tokenStillExists: true });
          
          // Try one more time with a slight delay
          await new Promise(resolve => setTimeout(resolve, 100));
          await SecureStore.deleteItemAsync('token');
        }
      }
      
      logAuth('Logout successful, all auth data cleared');
      return true;
    } catch (error) {
      logAuthError('Logout failed', error);
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
        
        // Store token in secure storage
        await SecureStore.setItemAsync('token', token);
        
        // Store user data
        await SecureStore.setItemAsync('user', JSON.stringify(user));
        
        // Store session expiry time
        await SecureStore.setItemAsync('sessionExpiryTime', sessionExpiryTime.toString());
        
        return { 
          user, 
          token,
          sessionExpiryTime,
        };
      }
      return rejectWithValue('Invalid registration data');
    } catch (error) {
      return rejectWithValue('Registration failed');
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
        const timeUntilExpiry = state.auth.sessionExpiryTime - now;

        // Check if session has expired
        if (now >= state.auth.sessionExpiryTime) {
          logAuth('Session expired, dispatching logout');
          // Dispatch logout action to clear credentials and trigger redirect
          await dispatch(logout()).unwrap(); 
          return { showWarning: false, expired: true }; 
        }

        // Check if it's time to show expiry warning (30 seconds before expiry)
        if (timeUntilExpiry <= EXPIRY_WARNING_TIME && timeUntilExpiry > 0) {
          return { showWarning: true, expired: false };
        }

      }
      // If no token or expiry time, or not expired/warning time, return default
      return { showWarning: false, expired: false };
    } catch (error) {
      logAuthError('Error checking session expiry', error);
      return { showWarning: false, expired: false }; 
    }
  }
);

// Start regular checking of session expiry
export const startSessionExpiryCheck = createAsyncThunk(
  'auth/startSessionExpiryCheck',
  async (_, { dispatch }) => {
    // Initial check
    dispatch(checkSessionExpiry());
    
    // We return nothing as this thunk just kicks off the process
    return null;
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
    },
    // Clear the expiry warning
    clearExpiryWarning: (state) => {
      state.showExpiryWarning = false;
    },
    // Force refresh of auth state
    forceRefresh: (state) => {
      // This is just a trigger for the thunk
    },
    // Manually set initialized state (for testing purposes)
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.initialized = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize auth
      .addCase(initializeAuth.pending, (state) => {
        logAuth('Auth initialization started');
        state.initialized = false;
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.initialized = true;
        
        if (action.payload) {
          logAuth('Auth initialization succeeded with user data');
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.sessionExpiryTime = action.payload.sessionExpiryTime;
        } else {
          logAuth('Auth initialization succeeded but no user data found');
          // Clear any existing data to ensure a clean state
          state.user = null;
          state.token = null;
          state.sessionExpiryTime = null;
        }
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        logAuthError('Auth initialization failed', action.error);
        state.isLoading = false;
        state.initialized = true;
        state.error = 'Failed to initialize authentication';
        // Don't clear existing auth data on error
      })
      
      // Login cases
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        logAuth('Login successful');
        state.isLoading = false;
        state.initialized = true; // Ensure initialized is true after login
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.sessionExpiryTime = action.payload.sessionExpiryTime;
      })
      .addCase(login.rejected, (state, action) => {
        logAuthError('Login failed', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Logout cases
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        logAuth('Logout successful, clearing state');
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.sessionExpiryTime = null;
        state.showExpiryWarning = false; // Also clear warning on logout
        // Keep initialized as true since we know the auth state (logged out)
      })
      .addCase(logout.rejected, (state, action) => {
        logAuthError('Logout failed', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
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
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Handle session expiry check
      .addCase(checkSessionExpiry.fulfilled, (state, action) => {
        if (action.payload) {
          state.showExpiryWarning = action.payload.showWarning;
        }
      })
      
      // Handle token validation
      .addCase(validateToken.rejected, (state) => {
        // If token validation fails, clear credentials
        state.user = null;
        state.token = null;
        state.sessionExpiryTime = null;
      });
  },
});

export const { setCredentials, clearCredentials, clearExpiryWarning, setInitialized } = authSlice.actions;

export default authSlice.reducer;
