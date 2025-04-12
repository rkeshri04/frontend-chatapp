import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAppSelector } from '../store/hooks';
import { useRouter } from 'expo-router';

export default function ChatLayout() {
  const token = useAppSelector(state => state.auth.token);
  const router = useRouter();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token) {
      router.replace('/(auth)');
    }
  }, [token, router]);
  
  return (
    <Stack>
      <Stack.Screen 
        name="[id]" 
        options={{
          headerShown: false, // Header is managed within the screen component
        }} 
      />
    </Stack>
  );
}
