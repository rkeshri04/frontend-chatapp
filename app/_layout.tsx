import { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { initializeAuth, checkSessionExpiry, updateActivity, logout, validateToken } from './store/slices/authSlice';
import { TouchableWithoutFeedback, AppState, AppStateStatus, Text } from 'react-native';

// Function to wrap the app with Redux Provider
export function RootLayoutNav() {
  return (
    <Provider store={store}>
      <AppWrapper />
    </Provider>
  );
}

// Component to handle auth state and session management
function AppWrapper() {
  const dispatch = useAppDispatch();
  const token = useAppSelector(state => state.auth.token);
  const sessionExpiryTime = useAppSelector(state => state.auth.sessionExpiryTime);
  const [initializing, setInitializing] = useState(true);

  // Initialize auth state on app startup
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize authentication from secure storage
        await dispatch(initializeAuth()).unwrap();
        console.log('Auth initialized successfully');
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setInitializing(false);
      }
    };

    initAuth();
  }, [dispatch]);

  // Set up session expiry timer but don't automatically log out
  useEffect(() => {
    if (token && sessionExpiryTime) {
      // Check session every minute
      const sessionTimer = setInterval(() => {
        const now = Date.now();
        if (now > sessionExpiryTime) {
          console.log('Session expiry detected in timer');
          // Don't automatically log out - just log the event
          // This allows the user to continue if they're actively using the app
          // Components can check session status themselves
        }
      }, 60000);

      return () => clearInterval(sessionTimer);
    }
  }, [token, sessionExpiryTime, dispatch]);

  // Handle app state changes to track activity
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && token) {
        // User returned to the app - update activity time
        dispatch(updateActivity());
        // Also check if session has expired
        dispatch(checkSessionExpiry());
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [token, dispatch]);

  // Track user interactions to update activity time
  const handleUserInteraction = () => {
    if (token) {
      dispatch(updateActivity());
    }
  };

  // If still initializing, you could show a loading screen here
  if (initializing) {
    return <Text style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>Loading...</Text>;
  }

  return (
    <TouchableWithoutFeedback onPress={handleUserInteraction}>
      <Slot />
    </TouchableWithoutFeedback>
  );
}

export default RootLayoutNav;
