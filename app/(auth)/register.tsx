import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal } from 'react-native'; // Removed Modal
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { register } from '../store/slices/authSlice';
import { useAppTheme } from '../hooks/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import PrivacyContent from '../../components/PrivacyContent';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isInfoModalVisible, setInfoModalVisible] = useState(false); // State for new modal
  const [infoModalTitle, setInfoModalTitle] = useState('');
  const [infoModalContentKey, setInfoModalContentKey] = useState(''); // Key to identify content
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isLoading = useAppSelector(state => state.auth.isLoading); // Get loading state
  const { colors, colorScheme } = useAppTheme(); // Get theme colors

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    // Basic password length check (optional)
    if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters long');
        return;
    }


    try {
      const result = await dispatch(register({ name, email, password })).unwrap();
      if (result) {
        // Navigate to tabs or maybe show a success message before navigating
        router.replace('../(tabs)');
      }
    } catch (error) {
      Alert.alert('Registration Failed', error as string);
      console.log('Registration error caught:', error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Updated modal functions
  const openInfoModal = (title: string, contentKey: string) => {
    setInfoModalTitle(title);
    setInfoModalContentKey(contentKey);
    setInfoModalVisible(true);
  };

  const closeInfoModal = () => {
    setInfoModalVisible(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardAvoidingContainer, { backgroundColor: colors.background }]} // Apply background here
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>Fill in your details to get started</Text>

        {/* Input fields and Sign Up button remain the same */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                color: colors.text,
                backgroundColor: colors.card,
              },
            ]}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.icon}
            editable={!isLoading}
          />

          <TextInput
            style={[
              styles.input,
              {
                borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                color: colors.text,
                backgroundColor: colors.card,
              },
            ]}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={colors.icon}
            editable={!isLoading}
            autoCorrect={false}
          />

          {/* Password Input with Visibility Toggle */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.passwordInput,
                {
                  borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                  color: colors.text,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder="Password (min. 6 characters)"
              value={password}
              onChangeText={setPassword}
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
            isLoading ? { opacity: 0.7 } : null, // Dim button when loading
          ]}
          onPress={handleRegister}
          disabled={isLoading} // Disable button when loading
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" /> // Show loader
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        {/* Sign In Link */}
        <View style={styles.footer}>
          <Text style={{ color: colors.text }}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('../(auth)')} disabled={isLoading}>
            <Text style={[styles.linkText, { color: colors.tint }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Terms and Privacy Footer - Outside ScrollView */}
      <View style={styles.termsContainer}>
        <Text style={[styles.termsText, { color: colors.icon }]}>
          By continuing you agree to our{' '}
          <Text style={[styles.linkText, { color: colors.tint }]} onPress={() => openInfoModal('Privacy Policy', 'privacy')}>
            Privacy Policy
          </Text>
          {' '}and{' '}
          <Text style={[styles.linkText, { color: colors.tint }]} onPress={() => openInfoModal('Terms of Condition', 'terms')}>
            Terms of Condition
          </Text>
          .
        </Text>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isInfoModalVisible}
        onRequestClose={closeInfoModal}
      >
        <View style={styles.modalCenteredView}>
          <View style={[styles.modalView, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Privacy Policy</Text>
            <ScrollView style={styles.modalContent}>
              <PrivacyContent colors={colors} />
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.tint }]}
              onPress={closeInfoModal}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// Update styles similarly to Login screen
const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: { // Renamed from 'container'
    flexGrow: 1,
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
  footer: { // Style for the "Already have an account?" link
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20, // Add margin below this footer before the terms
  },
  linkText: {
    fontWeight: 'bold',
  },
  termsContainer: { // Footer for terms - positioned outside scroll
    paddingVertical: 15,
    paddingHorizontal: 20,
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
