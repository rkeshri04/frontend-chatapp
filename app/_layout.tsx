import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { initializeAuth, checkSessionExpiry } from './store/slices/authSlice';
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
  return Array.isArray(segments) && segments.length > 0 && segments[0] === '(auth)';
}

// Component to handle auth state and session management
function AppWrapper() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments();
  const token = useAppSelector(state => state.auth.token);
  const sessionExpiryTime = useAppSelector(state => state.auth.sessionExpiryTime);
  const authInitialized = useAppSelector(state => state.auth.initialized);
  const { colors } = useAppTheme();
  const [initializing, setInitializing] = useState(true);

  // Dump the full auth state for debugging
  useEffect(() => {
    const state = store.getState();
    dumpAuthState(state);
  }, [token, authInitialized, initializing]);

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
            hasUser: !!authResult.user,
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
    // Wait until initialization is complete and auth state is known.
    if (initializing || !authInitialized) {
      logNavigation('Navigation effect skipped: Still initializing or auth not initialized', {
        initializing,
        authInitialized,
        isReady: router.isReady, // Log router state too
      });
      return;
    }

    // After initialization, router should generally be ready.
    // Log if it's not, but proceed with navigation logic based on auth token.
    if (!router.isReady) {
        logNavigation('Router reported not ready, but proceeding with navigation check as app is initialized.', {
            isReady: router.isReady,
        });
        // If issues persist, we might need to return here, but let's try proceeding first.
    }

    const inAuthGroup = isAuthGroup(segments);
    logNavigation('Navigation check', { token: !!token, inAuthGroup, segments: segments.join('/'), routerReady: router.isReady });

    if (!token) {
      // User is not logged in
      if (!inAuthGroup) {
        // User is not logged in and not in the auth section, redirect to login
        logNavigation('Redirecting to auth screen', { current: segments.join('/') });
        router.replace('/(auth)'); // Use absolute path
      } else {
        // User is not logged in and already in the auth section, do nothing
        logNavigation('Already in auth screen, no redirect needed', { current: segments.join('/') });
      }
    } else {
      // User is logged in
      if (inAuthGroup) {
        // User is logged in but still in the auth section, redirect to main app
        logNavigation('Redirecting to main app screen', { current: segments.join('/') });
        router.replace('/(tabs)'); // Use absolute path to main app area
      } else {
        // User is logged in and already in the main app section, do nothing
        logNavigation('Already in main app screen, no redirect needed', { current: segments.join('/') });
      }
    }
    // Keep dependencies the same, the logic inside just changed slightly.
  }, [token, initializing, authInitialized, router.isReady, segments, router]);

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
