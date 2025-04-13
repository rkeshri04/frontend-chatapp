import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../app/store/hooks';

const SessionExpiryNotification = () => {
  const showWarning = useAppSelector(state => state.auth.showExpiryWarning);
  const sessionExpiryTime = useAppSelector(state => state.auth.sessionExpiryTime);
  const token = useAppSelector(state => state.auth.token); 
  const [seconds, setSeconds] = useState(30);
  const slideAnim = useState(new Animated.Value(-100))[0];

  // Calculate and update remaining seconds
  useEffect(() => {
    if (showWarning && sessionExpiryTime && token) { 
      // Calculate seconds left
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((sessionExpiryTime - now) / 1000));
        setSeconds(remaining);
      };
      
      updateTimer();
      const timerId = setInterval(updateTimer, 1000);
      
      // Slide in animation when warning becomes visible
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      return () => clearInterval(timerId);
    } else {
      // Reset the animation when not showing or if token is removed
      slideAnim.setValue(-100); 
    }
  }, [showWarning, sessionExpiryTime, token, slideAnim]); 

  if (!showWarning || !token) { 
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="time-outline" size={24} color="#fff" />
        </View>
        <Text style={styles.message}>
          Your session will expire in {seconds} seconds
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ff3b30',
    padding: 12,
    paddingTop: 50, // Account for status bar
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 10,
  },
  message: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default SessionExpiryNotification;
