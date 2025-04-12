import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { login } from '../store/slices/authSlice';
import { useAppTheme } from '../hooks/useAppTheme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(state => state.auth.isLoading);
  const error = useAppSelector(state => state.auth.error);
  const { colors, colorScheme } = useAppTheme();

  const handleLogin = async () => {
    // Reset previous error
    if (error) {
      Alert.alert('Error', error);
    }

    // Form validation
    if (!email) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Password is required');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      // Attempt login
      const result = await dispatch(login({ email, password })).unwrap();
      if (result) {
        router.replace('../(tabs)');
      }
    } catch (error) {
      // Show the error from the server
      Alert.alert('Error', error as string);
      console.log('Login error caught:', error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Chat App</Text>
      <Text style={[styles.subtitle, { color: colors.icon }]}>Sign in to your account</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
              color: colors.text,
            },
          ]}
          placeholder="Email"
          value={email}
          onChangeText={(text) => setEmail(text)}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={colors.icon}
          editable={!isLoading}
          autoCorrect={false}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={[
              styles.passwordInput,
              {
                borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                color: colors.text,
              },
            ]}
            placeholder="Password"
            value={password}
            onChangeText={(text) => setPassword(text)}
            secureTextEntry={!showPassword}
            placeholderTextColor={colors.icon}
            editable={!isLoading}
          />
          <TouchableOpacity 
            style={styles.eyeButton} 
            onPress={togglePasswordVisibility}
            disabled={isLoading}
          >
            <Ionicons 
              name={showPassword ? 'eye-off' : 'eye'} 
              size={24} 
              color={colors.icon} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.tint },
          isLoading ? { opacity: 0.7 } : null,
        ]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={{ color: colors.text }}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('../(auth)/register')} disabled={isLoading}>
          <Text style={[styles.linkText, { color: colors.tint }]}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingRight: 50, // Make room for the eye button
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    height: 50,
    justifyContent: 'center',
  },
  button: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  linkText: {
    fontWeight: 'bold',
  },
});
