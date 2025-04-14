import { useEffect, useState, useRef } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Provider } from 'react-redux';
import { store, persistor } from './store/store'; // Import persistor
import { PersistGate } from 'redux-persist/integration/react'; // Import PersistGate
import { useAppDispatch, useAppSelector } from './store/hooks';
import { initializeAuth, checkSessionExpiry, logout } from './store/slices/authSlice';
import { initializeTheme } from './store/slices/themeSlice';
import { setSosDisguise, DisguiseType } from './store/slices/appStateSlice';
import { AppState, AppStateStatus, Text, View, ActivityIndicator, Alert } from 'react-native';
import SessionExpiryNotification from '../components/SessionExpiryNotification';
import DisguiseApp from '../components/DisguiseApp';
import DisguiseWeather from '../components/DisguiseWeather';
import DisguiseNotes from '../components/DisguiseNotes';
import { useAppTheme } from './hooks/useAppTheme';
import { logAuth, logAuthError, logNavigation, dumpAuthState } from '../utils/authLogger';

// Function to wrap the app with Redux Provider and PersistGate
export function RootLayoutNav() {
  return (
    <Provider store={store}>
      {/* Wrap AppWrapper with PersistGate */}
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <AppWrapper />
      </PersistGate>
    </Provider>
  );
}

// Simple loading screen component for PersistGate
const LoadingScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
};

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
  const sosModeActive = useAppSelector(state => state.appState.sosModeActive);
  const sosActivationTime = useAppSelector(state => state.appState.sosActivationTime);
  const selectedDisguise = useAppSelector(state => state.appState.selectedDisguise);
  const { colors } = useAppTheme();
  const [initializing, setInitializing] = useState(true);
  const sosLogoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  const disguiseComponents = {
    calculator: DisguiseApp,
    weather: DisguiseWeather,
    notes: DisguiseNotes,
  };
  const disguiseOptions = Object.keys(disguiseComponents) as Array<DisguiseType>;

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
      const sessionTimer = setInterval(() => {
        dispatch(checkSessionExpiry());
      }, 5000);

      return () => clearInterval(sessionTimer);
    }
  }, [token, sessionExpiryTime, dispatch]);

  // Handle SOS Mode Activation and Random Disguise Selection (using Redux)
  useEffect(() => {
    if (sosModeActive && !selectedDisguise) {
      const randomIndex = Math.floor(Math.random() * disguiseOptions.length);
      const disguiseToSet = disguiseOptions[randomIndex];
      dispatch(setSosDisguise(disguiseToSet));
      logAuth('SOS Mode Activated: Randomly selected and set disguise -', disguiseToSet);
    }
  }, [sosModeActive, selectedDisguise, dispatch]);

  // Handle SOS Mode Auto-Logout Timer
  useEffect(() => {
    if (sosLogoutTimerRef.current) {
      clearTimeout(sosLogoutTimerRef.current);
      sosLogoutTimerRef.current = null;
    }

    if (sosModeActive && sosActivationTime) {
      const thirtyMinutes = 30 * 60 * 1000;
      const timeElapsed = Date.now() - sosActivationTime;
      const timeRemaining = thirtyMinutes - timeElapsed;

      if (timeRemaining <= 0) {
        logAuth('SOS Mode duration exceeded, logging out.');
        dispatch(logout());
      } else {
        logAuth(`SOS Mode active. Setting auto-logout timer for ${Math.round(timeRemaining / 60000)} minutes.`);
        sosLogoutTimerRef.current = setTimeout(() => {
          if (store.getState().appState.sosModeActive) {
            logAuth('SOS Mode auto-logout timer expired, logging out.');
            Alert.alert("Session Expired", "SOS mode duration limit reached. You have been logged out.");
            dispatch(logout());
          } else {
            logAuth('SOS Mode auto-logout timer expired, but SOS mode was already exited.');
          }
        }, timeRemaining);
      }
    }

    return () => {
      if (sosLogoutTimerRef.current) {
        logAuth('Clearing SOS auto-logout timer.');
        clearTimeout(sosLogoutTimerRef.current);
        sosLogoutTimerRef.current = null;
      }
    };
  }, [sosModeActive, sosActivationTime, dispatch]);

  // Handle navigation based on auth state (only if NOT in SOS mode)
  useEffect(() => {
    if (sosModeActive) {
      return;
    }

    if (initializing || !authInitialized) {
      return;
    }

    const inAuthGroup = isAuthGroup(segments);

    if (!token) {
      if (!inAuthGroup) {
        router.replace('../(auth)');
      } else {
      }
    } else {
      if (inAuthGroup) {
        router.replace('../(tabs)');
      } 
    }
  }, [token, initializing, authInitialized, segments, router, sosModeActive]);

  // Handle app state changes to track activity
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && token) {
        logAuth('App returned to foreground, checking session');
        dispatch(checkSessionExpiry());
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [token, dispatch]);

  if (initializing) {
    return <LoadingScreen />;
  }

  const RenderDisguiseComponent = selectedDisguise ? disguiseComponents[selectedDisguise] : null;

  return (
    <View style={{ flex: 1 }}>
      {sosModeActive && RenderDisguiseComponent ? (
        <RenderDisguiseComponent />
      ) : (
        <>
          {!sosModeActive && <SessionExpiryNotification />}
          <Slot />
        </>
      )}
    </View>
  );
}

export default RootLayoutNav;
