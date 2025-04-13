import { Stack } from 'expo-router';
import { useAppTheme } from '../hooks/useAppTheme';

export default function ChatLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        // Explicitly ensure this stack shows headers
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.tint, // Sets the default back arrow color
        headerTitleStyle: {
          color: colors.text,
        },
        headerShadowVisible: false,
      }}
    />
  );
}
