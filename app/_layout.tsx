import { useEffect, useState, useRef } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { initializeAuth, checkSessionExpiry, logout } from './store/slices/authSlice';
import { initializeTheme } from './store/slices/themeSlice';
import { AppState, AppStateStatus, Text, View, ActivityIndicator } from 'react-native';
import SessionExpiryNotification from '../components/SessionExpiryNotification';
import { useAppTheme } from './hooks/useAppTheme';
import { logAuth, logAuthError, logNavigation, dumpAuthState } from '../utils/authLogger';

// Function to wrap the app with Redux Provider
export function RootLayoutNav() {
  return (
    <Provider store={store}>
      <AppWrapper />
    </Provider>
  );
}

// Helper to check if path is in auth group
function isAuthGroup(segments: string[]) {
  return segments[0] === '(auth)';
}

// Component to handle auth state and session management
function AppWrapper() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments();
  const token = useAppSelector(state => state.auth.token);
  const sessionExpiryTime = useAppSelector(state => state.auth.sessionExpiryTime);
  const authInitialized = useAppSelector(state => state.auth.initialized);
  const authError = useAppSelector(state => state.auth.error);
  const { colors, colorScheme } = useAppTheme();
  const [initializing, setInitializing] = useState(true);
  
  // Used to prevent multiple redirects
  const hasRedirected = useRef(false);
  
  // Dump the full auth state for debugging
  useEffect(() => {
    const state = store.getState();
    dumpAuthState(state);
  }, [token, authInitialized, initializing]);
  
  // Log navigation changes
  // useEffect(() => {
  //   logNavigation(segments.join('/'), 'Navigate');
  // }, [segments]);

  // Initialize auth state and theme on app startup
  useEffect(() => {
    const initialize = async () => {
      try {
        logAuth('Starting app initialization');
        
        // Initialize theme from storage first
        await dispatch(initializeTheme()).unwrap();
        logAuth('Theme initialized successfully');
        
        // Then initialize authentication from secure storage
        const authResult = await dispatch(initializeAuth()).unwrap();
        logAuth('Auth initialized', authResult ? 'User found' : 'No user found');
        
        if (authResult) {
          logAuth('Auth found in storage', { 
            hasToken: !!authResult.token,
            hasUser: !!authResult.user 
          });
        } else {
          logAuth('No auth data found in storage');
        }
      } catch (error) {
        logAuthError('App initialization failed', error);
      } finally {
        logAuth('Completing initialization process');
        setInitializing(false);
      }
    };

    initialize();
  }, [dispatch]);

  // Set up session expiry check at more frequent intervals (every 5 seconds)
  useEffect(() => {
    if (token && sessionExpiryTime) {
      // Check session every 5 seconds to ensure we can show the 30-second warning
      const sessionTimer = setInterval(() => {
        dispatch(checkSessionExpiry());
      }, 5000);

      return () => clearInterval(sessionTimer);
    }
  }, [token, sessionExpiryTime, dispatch]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (initializing) {
      // Still loading, don't redirect yet
      return;
    }

    // Get current route info for logging
    const inAuthGroup = isAuthGroup(segments);
    
    // Need to check if the user is logged in or not
    if (authInitialized) {
      if (!token) {
        // No token, redirect to auth unless already there
        if (!inAuthGroup && !hasRedirected.current) {
          hasRedirected.current = true;
          router.replace('../(auth)');
        }
      } else {
        // Has token, redirect to main app unless already there
        if (inAuthGroup && !hasRedirected.current) {
          hasRedirected.current = true;
          router.replace('../(tabs)');
        }
      }
    } else {
      logAuth(`Auth not yet initialized, waiting before navigation decisions`);
    }
  }, [token, initializing, authInitialized, router, segments]);

  // Handle app state changes to track activity
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && token) {
        logAuth('App returned to foreground, checking session');
        // Also check if session has expired
        dispatch(checkSessionExpiry());
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [token, dispatch]);

  // If still initializing, show a loading screen
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ marginTop: 20, color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SessionExpiryNotification />
      <Slot />
    </View>
  );
}

export default RootLayoutNav;
