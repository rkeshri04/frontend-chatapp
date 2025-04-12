import { useEffect, useState } from 'react';
import { Slot, useRouter } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { initializeAuth, checkSessionExpiry, updateActivity, logout } from './store/slices/authSlice';
import { TouchableWithoutFeedback, AppState, AppStateStatus, Text, View } from 'react-native';
import SessionExpiryNotification from '../components/SessionExpiryNotification';

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
  const router = useRouter();
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

  // Redirect to login screen when logged out
  useEffect(() => {
    if (!initializing && !token) {
      router.replace('/(auth)');
    }
  }, [token, initializing, router]);

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
      <View style={{ flex: 1 }}>
        <SessionExpiryNotification />
        <Slot />
      </View>
    </TouchableWithoutFeedback>
  );
}

export default RootLayoutNav;
