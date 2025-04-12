import * as SecureStore from 'expo-secure-store';
import { store } from '../app/store/store';

/**
 * Debug function to check the auth token status
 * Call this from any component to log auth info
 */
export const debugAuthToken = async () => {
  try {
    console.log('========= AUTH DEBUG INFO =========');
    
    // Check token in SecureStore
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      console.log('Token found in SecureStore');
      console.log('Token type:', typeof token);
      console.log('Token length:', token.length);
      console.log('Token preview:', token.substring(0, 15) + '...');
      console.log('Is Bearer prefixed:', token.startsWith('Bearer '));
    } else {
      console.log('No token found in SecureStore');
    }
    
    // Check user data
    const userJson = await SecureStore.getItemAsync('user');
    if (userJson) {
      console.log('User data found in SecureStore');
      const user = JSON.parse(userJson);
      console.log('User data keys:', Object.keys(user));
    } else {
      console.log('No user data found in SecureStore');
    }
    
    // Check session info
    const sessionExpiry = await SecureStore.getItemAsync('sessionExpiryTime');
    if (sessionExpiry) {
      const expiryTime = parseInt(sessionExpiry);
      const now = Date.now();
      const timeLeft = expiryTime - now;
      console.log('Session expiry found:', new Date(expiryTime).toLocaleString());
      console.log('Time until expiry:', Math.floor(timeLeft / 60000), 'minutes', Math.floor((timeLeft % 60000) / 1000), 'seconds');
      console.log('Session expired:', timeLeft <= 0);
      
      // Check session warning state
      const state = store.getState();
      console.log('Show warning flag:', state.auth.showExpiryWarning);
      console.log('Should show warning:', timeLeft <= 30000 && timeLeft > 0);
    } else {
      console.log('No session expiry info found');
    }
    
    // Check Redux store state
    const state = store.getState();
    console.log('Redux auth state:', {
      hasToken: !!state.auth.token,
      hasUser: !!state.auth.user,
      initialized: state.auth.initialized,
      isLoading: state.auth.isLoading,
      showExpiryWarning: state.auth.showExpiryWarning,
      sessionExpiryTime: state.auth.sessionExpiryTime ? new Date(state.auth.sessionExpiryTime).toLocaleTimeString() : null,
    });
    
    console.log('===================================');
  } catch (error) {
    console.error('Error in auth debugger:', error);
  }
};

/**
 * Call this function to test a simple authenticated request
 */
export const testAuthRequest = async (apiUrl: string) => {
  try {
    console.log('======= TESTING AUTH REQUEST =======');
    
    // Get token
    const token = await SecureStore.getItemAsync('token');
    if (!token) {
      console.log('No token available for test');
      return;
    }
    
    // Create headers
    const headers = {
      'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('Request URL:', apiUrl + '/auth/me');
    console.log('Using headers:', {
      ...headers,
      'Authorization': headers.Authorization.substring(0, 15) + '...'
    });
    
    // Make a simple fetch request to test auth
    const response = await fetch(`${apiUrl}/auth/me`, {
      method: 'GET',
      headers: headers
    });
    
    console.log('Response status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', data);
      console.log('Auth test successful');
    } else {
      const errorText = await response.text();
      console.log('Auth test failed with error:', errorText);
    }
    
    console.log('===================================');
  } catch (error) {
    console.error('Error in auth test:', error);
  }
};

/**
 * Set a session that will expire in the specified number of seconds
 * This is useful for testing expiry behavior
 */
export const setQuickExpirySession = async (secondsUntilExpiry: number = 35) => {
  try {
    console.log(`Setting test session to expire in ${secondsUntilExpiry} seconds`);
    
    // Get current token and user
    const token = await SecureStore.getItemAsync('token');
    const userJson = await SecureStore.getItemAsync('user');
    
    if (!token || !userJson) {
      console.log('No active session to modify');
      return;
    }
    
    // Set expiry time to be X seconds from now
    const expiryTime = Date.now() + (secondsUntilExpiry * 1000);
    await SecureStore.setItemAsync('sessionExpiryTime', expiryTime.toString());
    
    console.log('Quick expiry session set - expiry at:', new Date(expiryTime).toLocaleTimeString());
    console.log('Warning should appear in:', secondsUntilExpiry - 30, 'seconds');
    
    // Force refresh the Redux state by reloading
    store.dispatch({ type: 'auth/forceRefresh' });
    
    return true;
  } catch (error) {
    console.error('Error setting quick expiry session:', error);
    return false;
  }
};

/**
 * Force a clean slate by clearing all auth data
 */
export const clearAllAuthData = async () => {
  try {
    console.log('Clearing all auth data from secure storage');
    
    // Remove all auth-related items from secure storage
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('sessionExpiryTime');
    
    // Force Redux to refresh
    store.dispatch({ type: 'auth/forceRefresh' });
    
    console.log('All auth data cleared');
    return true;
  } catch (error) {
    console.error('Error clearing auth data:', error);
    return false;
  }
};
