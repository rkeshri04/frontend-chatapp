import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '../app/store/hooks';
import { exitSosMode } from '../app/store/slices/appStateSlice';

const DisguiseWeather = () => {
  const dispatch = useAppDispatch();
  const [tapCount, setTapCount] = useState(0);
  const lastTapTimeRef = useRef<number>(0);

  // Example static weather data
  const weatherData = {
    city: 'San Francisco',
    temperature: 16,
    condition: 'Partly Cloudy',
    icon: 'partly-sunny-outline',
    high: 18,
    low: 12,
  };

  const handleTap = () => {
    const now = Date.now();
    // Reset count if taps are too far apart (e.g., > 1 second)
    if (now - lastTapTimeRef.current > 1000) {
      setTapCount(1);
    } else {
      setTapCount(prevCount => prevCount + 1);
    }
    lastTapTimeRef.current = now;

    // Check for exit sequence (e.g., 5 quick taps on the temperature)
    if (tapCount + 1 >= 5) {
      Alert.alert(
        "Exit SOS Mode?",
        "Are you sure you want to return to the normal application?",
        [
          { text: "Cancel", style: "cancel", onPress: () => setTapCount(0) },
          {
            text: "Exit",
            style: "default",
            onPress: () => {
              dispatch(exitSosMode());
            },
          },
        ]
      );
      setTapCount(0); // Reset after alert
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.city}>{weatherData.city}</Text>
        <TouchableOpacity onPress={handleTap} activeOpacity={0.8}>
          <Text style={styles.temperature}>{weatherData.temperature}°</Text>
        </TouchableOpacity>
        <View style={styles.conditionContainer}>
          <Ionicons name={weatherData.icon as any} size={60} color="#fff" />
          <Text style={styles.conditionText}>{weatherData.condition}</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.detailText}>H:{weatherData.high}° L:{weatherData.low}°</Text>
        </View>
      </View>
      {/* Add more fake UI elements if desired */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Weather data is simulated</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4A90E2', // Blue background for weather
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  city: {
    fontSize: 36,
    color: '#fff',
    fontWeight: '300',
    marginBottom: 10,
  },
  temperature: {
    fontSize: 96,
    color: '#fff',
    fontWeight: '100', // Thin font for temperature
    marginBottom: 10,
  },
  conditionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  conditionText: {
    fontSize: 24,
    color: '#fff',
    marginLeft: 10,
    fontWeight: '400',
  },
  details: {
    marginTop: 10,
  },
  detailText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
  },
  footer: {
      padding: 10,
      alignItems: 'center',
  },
  footerText: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.7)',
  }
});

export default DisguiseWeather;
