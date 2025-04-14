import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define possible disguise types
export type DisguiseType = 'calculator' | 'weather' | 'notes';

interface AppStateState {
  sosModeActive: boolean;
  sosActivationTime: number | null; // Timestamp when SOS mode was activated
  selectedDisguise: DisguiseType | null; // Store the selected disguise type
}

const initialState: AppStateState = {
  sosModeActive: false,
  sosActivationTime: null,
  selectedDisguise: null, // Initialize as null
};

const appStateSlice = createSlice({
  name: 'appState',
  initialState,
  reducers: {
    enterSosMode: (state) => {
      // Only set activation time if not already active (prevents resetting timer on quick toggles)
      if (!state.sosModeActive) {
        state.sosActivationTime = Date.now();
        console.log('SOS Mode Activated at:', new Date(state.sosActivationTime).toLocaleTimeString());
      }
      state.sosModeActive = true;
      // Disguise selection logic will be handled in the component and dispatched via setSosDisguise
    },
    exitSosMode: (state) => {
      state.sosModeActive = false;
      state.sosActivationTime = null; // Clear activation time
      state.selectedDisguise = null; // Clear selected disguise
      console.log('SOS Mode Deactivated');
    },
    setSosDisguise: (state, action: PayloadAction<DisguiseType>) => {
      if (state.sosModeActive) { // Only set disguise if SOS mode is active
        state.selectedDisguise = action.payload;
        console.log('SOS Disguise set to:', action.payload);
      }
    },
  },
});

export const { enterSosMode, exitSosMode, setSosDisguise } = appStateSlice.actions;
export default appStateSlice.reducer;
