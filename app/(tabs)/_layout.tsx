import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useAppSelector } from '../store/hooks';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  const token = useAppSelector(state => state.auth.token);
  const router = useRouter();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token) {
      router.replace('/(auth)');
    }
  }, [token, router]);
  
  if (!token) {
    return null; // Don't render anything while redirecting
  }
  
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
