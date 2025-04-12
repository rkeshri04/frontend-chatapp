import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '../store/hooks';
import { login } from '../store/slices/authSlice';
import { Colors } from '../../constants/Colors';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const result = await dispatch(login({ email, password })).unwrap();
      if (result) {
        router.replace('../(tabs)');
      }
    } catch (error) {
      Alert.alert('Login Failed', error as string);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Chat App</Text>
      <Text style={[styles.subtitle, { color: colors.icon }]}>Sign in to your account</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { borderColor: colorScheme === 'dark' ? '#333' : '#ddd', color: colors.text }]}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={colors.icon}
        />
        
        <TextInput
          style={[styles.input, { borderColor: colorScheme === 'dark' ? '#333' : '#ddd', color: colors.text }]}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={colors.icon}
        />
      </View>
      
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.tint }]} onPress={handleLogin}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>
      
      <View style={styles.footer}>
        <Text style={{ color: colors.text }}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
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
});
