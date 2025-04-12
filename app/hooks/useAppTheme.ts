import { useColorScheme } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { Colors } from '../../constants/Colors';

/**
 * Custom hook that provides the current theme colors based on Redux state
 * and falls back to system preference when needed
 */
export function useAppTheme() {
  const systemColorScheme = useColorScheme();
  const themeMode = useAppSelector(state => state.theme.mode);
  
  // Determine which color scheme to use
  const actualColorScheme = themeMode === 'system' ? systemColorScheme : themeMode;
  
  // Get colors for the current theme
  const colors = Colors[actualColorScheme ?? 'light'];
  
  return {
    colorScheme: actualColorScheme,
    colors,
    themeMode
  };
}
