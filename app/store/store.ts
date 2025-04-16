import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Or your preferred storage

import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import themeReducer from './slices/themeSlice';
import searchReducer from './slices/searchSlice';
import appStateReducer from './slices/appStateSlice';

// Configuration for persisting appState
const appStatePersistConfig = {
  key: 'appState',
  storage: AsyncStorage,
  // Optionally whitelist specific fields if needed, otherwise persists the whole slice
  // whitelist: ['sosModeActive', 'sosActivationTime', 'selectedDisguise']
};

// Combine reducers
const rootReducer = combineReducers({
  auth: authReducer,
  chat: chatReducer,
  theme: themeReducer,
  search: searchReducer,
  // Apply persistence wrapper only to appState reducer
  appState: persistReducer(appStatePersistConfig, appStateReducer),
});

export const store = configureStore({
  reducer: rootReducer, // Use the combined rootReducer
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types from redux-persist
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Create the persistor object
export const persistor = persistStore(store);

// Define RootState based on the rootReducer
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

// Add a default export to fix the route issue
export default function StoreComponent() {
}
