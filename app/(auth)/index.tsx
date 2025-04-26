import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,Modal } from 'react-native'; // Removed Modal
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { login } from '../store/slices/authSlice';
import { useAppTheme } from '../hooks/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import PrivacyContent from '../../components/PrivacyContent';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPrivacyContentVisible, setPrivacyContentVisible] = useState(false);
  const [PrivacyContentTitle, setPrivacyContentTitle] = useState('');
  const [PrivacyContentContentKey, setPrivacyContentContentKey] = useState('');
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

  // Updated modal functions
  const openPrivacyContent = (title: string, contentKey: string) => {
    setPrivacyContentTitle(title);
    setPrivacyContentContentKey(contentKey); // Use a key or identifier
    setPrivacyContentVisible(true);
  };

  const closePrivacyContent = () => {
    setPrivacyContentVisible(false);
    // Optionally reset title/contentKey after animation
    // setTimeout(() => {
    //   setPrivacyContentTitle('');
    //   setPrivacyContentContentKey('');
    // }, 300); // Match modal animation duration
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardAvoidingContainer, { backgroundColor: colors.background }]} // Apply background here
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled" // Dismiss keyboard on tap outside inputs
      >
        <Text style={[styles.title, { color: colors.text }]}>Chat App</Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>Sign in to your account</Text>

        {/* Input fields and Sign In button remain the same */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                color: colors.text,
                backgroundColor: colors.card, // Added background for better visibility
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
                  backgroundColor: colors.card, // Added background for better visibility
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


        {/* Sign Up Link */}
        <View style={styles.footer}>
          <Text style={{ color: colors.text }}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('../(auth)/register')} disabled={isLoading}>
            <Text style={[styles.linkText, { color: colors.tint }]}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Terms and Privacy Footer - Outside ScrollView, inside KeyboardAvoidingView */}
      <View style={styles.termsContainer}>
        <Text style={[styles.termsText, { color: colors.icon }]}>
          By continuing you agree to our{' '}
          <Text style={[styles.linkText, { color: colors.tint }]} onPress={() => openPrivacyContent('Privacy Policy', 'privacy')}>
            Privacy Policy
          </Text>
          {' '}and{' '}
          <Text style={[styles.linkText, { color: colors.tint }]} onPress={() => openPrivacyContent('Terms of Condition', 'terms')}>
            Terms of Condition
          </Text>
          .
        </Text>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isPrivacyContentVisible}
        onRequestClose={closePrivacyContent}
      >
        <View style={styles.modalCenteredView}>
          <View style={[styles.modalView, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Privacy Policy</Text>
            <ScrollView style={styles.modalContent}>
              <PrivacyContent colors={colors} />
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.tint }]}
              onPress={closePrivacyContent}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1, // Takes full screen height
  },
  scrollContainer: { // Renamed from 'container'
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center', // Center content vertically in the scrollable area
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
  },
  passwordInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingRight: 50,
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
    marginTop: 10,
    marginBottom: 20, // Add margin below this footer before the terms
  },
  linkText: {
    fontWeight: 'bold',
  },
  termsContainer: {
    paddingVertical: 15, // Add vertical padding
    paddingHorizontal: 20, // Match screen padding
    alignItems: 'center',
  },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom:20
  },
  modalCenteredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
    height: '85%',
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    marginBottom: 20,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 2,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
});
