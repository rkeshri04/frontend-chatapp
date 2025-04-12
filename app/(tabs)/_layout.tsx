import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAppSelector } from '../store/hooks';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  const token = useAppSelector(state => state.auth.token);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const router = useRouter();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token) {
      router.replace('../(auth)');
    }
  }, [token, router]);
  
  if (!token) {
    return null; // Don't render anything while redirecting
  }
  
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: backgroundColor,
          height: 40 + insets.top,
          borderBottomColor: borderColor,
          borderBottomWidth: 0.5,
        },
        headerTitleStyle: {
          color: textColor,
          fontSize: 16,
        },
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarStyle: {
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
          height: 50 + (Platform.OS === 'ios' ? insets.bottom : 0),
          backgroundColor: backgroundColor,
          borderTopColor: borderColor,
        },
      }}
      >
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
