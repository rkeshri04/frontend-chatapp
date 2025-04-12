import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Alert, useColorScheme, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout, updateActivity } from '../store/slices/authSlice';
import { setThemeMode, saveTheme } from '../store/slices/themeSlice';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { debugAuthToken, testAuthRequest, setQuickExpirySession } from '../../utils/authDebugger';
import Constants from 'expo-constants';
import { Colors } from '../../constants/Colors';

export default function ProfileScreen() {
  const user = useAppSelector(state => state.auth.user);
  const sessionExpiryTime = useAppSelector(state => state.auth.sessionExpiryTime);
  const themeMode = useAppSelector(state => state.theme.mode);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState('');
  const systemColorScheme = useColorScheme();
  
  // Use theme from Redux, falling back to system preference if set to 'system'
  const actualColorScheme = themeMode === 'system' ? systemColorScheme : themeMode;
  const colors = Colors[actualColorScheme ?? 'light'];

  // Dark mode switch state
  const [isDarkMode, setIsDarkMode] = useState(themeMode === 'dark');
  const [useSystemTheme, setUseSystemTheme] = useState(themeMode === 'system');

  // Update activity on screen focus
  useEffect(() => {
    dispatch(updateActivity());
  }, [dispatch]);
  
  // Sync switch states with Redux theme state
  useEffect(() => {
    setIsDarkMode(themeMode === 'dark');
    setUseSystemTheme(themeMode === 'system');
  }, [themeMode]);

  // Display countdown for session expiry
  useEffect(() => {
    if (sessionExpiryTime) {
      const updateTimer = () => {
        const now = Date.now();
        const remaining = sessionExpiryTime - now;
        
        if (remaining <= 0) {
          setTimeRemaining('Session expired');
          return;
        }
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(`${minutes}m ${seconds}s`);
      };
      
      updateTimer();
      const timerId = setInterval(updateTimer, 1000);
      
      return () => clearInterval(timerId);
    }
  }, [sessionExpiryTime]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(logout()).unwrap();
              router.replace('../(auth)');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  // Toggle for dark mode
  const toggleDarkMode = (value: any) => {
    setIsDarkMode(value);
    setUseSystemTheme(false);
    const newTheme = value ? 'dark' : 'light';
    dispatch(saveTheme(newTheme));
  };
  
  // Toggle for system theme
  const toggleSystemTheme = (value: any) => {
    setUseSystemTheme(value);
    if (value) {
      // If using system theme, update Redux accordingly
      dispatch(saveTheme('system'));
    } else {
      // If turning off system theme, default to current actual color scheme
      const fallbackTheme = actualColorScheme === 'dark' ? 'dark' : 'light';
      dispatch(saveTheme(fallbackTheme));
      setIsDarkMode(actualColorScheme === 'dark');
    }
  };

  // Update activity on user interaction
  const handleMenuPress = () => {
    dispatch(updateActivity());
  };

  // Add this function to debug authentication
  const handleDebugAuth = async () => {
    await debugAuthToken();
    const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8000';
    await testAuthRequest(apiUrl);
    dispatch(updateActivity());
  };

  // Add test function for session expiry
  const handleTestSessionExpiry = async () => {
    await setQuickExpirySession(35); // Set session to expire in 35 seconds (warning at 5s)
    Alert.alert('Test Session Expiry', 'Session set to expire in 35 seconds. Warning should appear in 5 seconds.');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.tint }]}>
          <Text style={styles.avatarText}>
            {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>
          {user?.username || user?.email || 'User'}
        </Text>
        <Text style={[styles.userEmail, { color: colors.icon }]}>
          {user?.email || 'user@example.com'}
        </Text>
        
        {timeRemaining && (
          <View style={[styles.sessionInfo, { backgroundColor: actualColorScheme === 'dark' ? '#333' : '#f0f0f0' }]}>
            <Text style={[styles.sessionInfoText, { color: colors.text }]}>
              Session expires in: {timeRemaining}
            </Text>
          </View>
        )}
      </View>

      {/* Theme Settings Section */}
      <View style={[styles.section]}>
        <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
          <Ionicons name="color-palette-outline" size={24} color={colors.tint} />
          <Text style={[styles.menuText, { color: colors.text }]}>Use System Theme</Text>
          <Switch
            value={useSystemTheme}
            onValueChange={toggleSystemTheme}
            trackColor={{ false: '#767577', true: colors.tint }}
            thumbColor="#f4f3f4"
          />
        </View>
        
        {!useSystemTheme && (
          <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="moon-outline" size={24} color={colors.tint} />
            <Text style={[styles.menuText, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#767577', true: colors.tint }}
              thumbColor="#f4f3f4"
            />
          </View>
        )}
      </View>

      <View style={[styles.section]}>
        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleMenuPress}>
          <Ionicons name="person-outline" size={24} color={colors.tint} />
          <Text style={[styles.menuText, { color: colors.text }]}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.icon} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleMenuPress}>
          <Ionicons name="notifications-outline" size={24} color={colors.tint} />
          <Text style={[styles.menuText, { color: colors.text }]}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.icon} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleMenuPress}>
          <Ionicons name="lock-closed-outline" size={24} color={colors.tint} />
          <Text style={[styles.menuText, { color: colors.text }]}>Privacy</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.icon} />
        </TouchableOpacity>
      </View>

      <View style={[styles.section]}>
        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleMenuPress}>
          <Ionicons name="help-circle-outline" size={24} color={colors.tint} />
          <Text style={[styles.menuText, { color: colors.text }]}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.icon} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleMenuPress}>
          <Ionicons name="information-circle-outline" size={24} color={colors.tint} />
          <Text style={[styles.menuText, { color: colors.text }]}>About</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.icon} />
        </TouchableOpacity>
      </View>

      {/* Add this section for debugging */}
      {/* <View style={[styles.section, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleDebugAuth}>
          <Ionicons name="bug-outline" size={24} color={colors.tint} />
          <Text style={[styles.menuText, { color: colors.text }]}>Debug Authentication</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.icon} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleTestSessionExpiry}>
          <Ionicons name="time-outline" size={24} color={colors.tint} />
          <Text style={[styles.menuText, { color: colors.text }]}>Test Session Expiry</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.icon} />
        </TouchableOpacity>

      </View> */}
      
      <TouchableOpacity 
        style={[styles.logoutButton]} 
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    marginBottom: 10,
  },
  sessionInfo: {
    marginTop: 5,
    padding: 8,
    borderRadius: 15,
  },
  sessionInfoText: {
    fontWeight: '500',
  },
  section: {
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 20,
  },
  logoutText: {
    color: '#FF3B30',
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '500',
  },
});
