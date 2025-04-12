import * as SecureStore from 'expo-secure-store';

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
      console.log('Time until expiry:', Math.floor(timeLeft / 60000), 'minutes');
      console.log('Session expired:', timeLeft <= 0);
    } else {
      console.log('No session expiry info found');
    }
    
    // Check activity time
    const activityTime = await SecureStore.getItemAsync('lastActivityTime');
    if (activityTime) {
      const lastActivity = parseInt(activityTime);
      const now = Date.now();
      const idleTime = now - lastActivity;
      console.log('Last activity:', new Date(lastActivity).toLocaleString());
      console.log('Idle time:', Math.floor(idleTime / 60000), 'minutes');
    } else {
      console.log('No activity time info found');
    }
    
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
