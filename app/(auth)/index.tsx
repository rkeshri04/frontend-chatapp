import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, useColorScheme, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { login } from '../store/slices/authSlice';
import { Colors } from '../../constants/Colors';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isLoading = useAppSelector(state => state.auth.isLoading);

  const handleLogin = async () => {
    // Reset previous error
    setErrorMessage(null);
    
    // Form validation
    if (!email) {
      setErrorMessage('Email is required');
      return;
    }
    
    if (!password) {
      setErrorMessage('Password is required');
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
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
      setErrorMessage(error as string);
      console.log('Login error caught:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Chat App</Text>
      <Text style={[styles.subtitle, { color: colors.icon }]}>Sign in to your account</Text>
      
      {errorMessage && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input, 
            { 
              borderColor: colorScheme === 'dark' ? '#333' : '#ddd', 
              color: colors.text 
            },
            errorMessage && !email ? { borderColor: '#FF3B30' } : null
          ]}
          placeholder="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errorMessage) setErrorMessage(null);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={colors.icon}
          editable={!isLoading}
          autoCorrect={false}
        />
        
        <TextInput
          style={[
            styles.input, 
            { 
              borderColor: colorScheme === 'dark' ? '#333' : '#ddd', 
              color: colors.text 
            },
            errorMessage && !password ? { borderColor: '#FF3B30' } : null
          ]}
          placeholder="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (errorMessage) setErrorMessage(null);
          }}
          secureTextEntry
          placeholderTextColor={colors.icon}
          editable={!isLoading}
        />
      </View>
      
      <TouchableOpacity 
        style={[
          styles.button, 
          { backgroundColor: colors.tint },
          isLoading ? { opacity: 0.7 } : null
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
        <TouchableOpacity onPress={() => router.push('/(auth)/register')} disabled={isLoading}>
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
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
});
