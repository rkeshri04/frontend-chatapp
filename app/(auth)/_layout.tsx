import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAppSelector } from '../store/hooks';
import { useRouter } from 'expo-router';

export default function AuthLayout() {
  const token = useAppSelector(state => state.auth.token);
  const router = useRouter();
  
  // Redirect to tabs if already authenticated
  useEffect(() => {
    if (token) {
      router.replace('/(tabs)');
    }
  }, [token, router]);
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
