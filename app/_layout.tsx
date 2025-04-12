import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { initializeAuth, checkSessionExpiry, updateActivity, logout } from './store/slices/authSlice';
import { TouchableWithoutFeedback, AppState, AppStateStatus } from 'react-native';

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
  
  // Initialize auth state on app startup
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);
  
  // Set up session expiry timer
  useEffect(() => {
    if (token) {
      // Check session every minute
      const sessionTimer = setInterval(() => {
        dispatch(checkSessionExpiry());
      }, 60000);
      
      return () => clearInterval(sessionTimer);
    }
  }, [token, dispatch]);
  
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
  
  return (
    <TouchableWithoutFeedback onPress={handleUserInteraction}>
      <Slot />
    </TouchableWithoutFeedback>
  );
}

export default RootLayoutNav;
