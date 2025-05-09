import { Stack } from 'expo-router';
import { useAppTheme } from '../hooks/useAppTheme';

export default function AuthLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: "Sign In",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="register" // Changed from 'signup'
        options={{
          headerTitle: "Create Account",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
