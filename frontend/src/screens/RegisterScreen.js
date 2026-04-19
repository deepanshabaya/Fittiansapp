import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
// FIX: Same fix as LoginScreen — use safe-area-context for correct edge handling.
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../navigation/AppNavigator';
import { register as registerApi } from '../services/api';

export default function RegisterScreen({ navigation, route }) {
  const { login } = useAuth();
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState(route.params?.email || '');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    if (!mobile || !email || !password) {
      Alert.alert('Missing fields', 'Please fill all fields.');
      return;
    }
    if (!/^\d{10,15}$/.test(mobile.trim())) {
      Alert.alert('Invalid mobile', 'Mobile must be 10–15 digits.');
      return;
    }

    try {
      setIsRegistering(true);
      console.log(`[REGISTER] Starting flow for mobile: ${mobile}`);
      const data = await registerApi({ mobile: mobile.trim(), email: email.trim(), password });
      console.log(`[REGISTER] Success.`);

      const requiresApproval = data.requiresApproval || false;
      await login({ user: data.user, token: data.token, requiresApproval });

      if (requiresApproval) {
        Alert.alert('Registered!', 'Your profile is pending admin approval.');
        navigation.replace('TrainerVerification');
      } else {
        Alert.alert('Success', 'Registration completed!');
      }
    } catch (err) {
      console.log(`[REGISTER ERROR]`, err.message);
      Alert.alert('Registration failed', err.message || 'Unable to register');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    // FIX: Auth screens (no tab bar below) need edges={['top', 'bottom']} to
    // protect against both status bar overlap at top and home indicator at bottom.
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1716" />
      {/*
        FIX: Added KeyboardAvoidingView + ScrollView — the Register form has 3
        inputs and a button; on small devices the password field and Register
        button were hidden behind the keyboard in the original layout.
      */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Register</Text>
          <Text style={styles.subtitle}>
            Enter the mobile number registered by admin
          </Text>

          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={15}
            value={mobile}
            onChangeText={setMobile}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={isRegistering}
          >
            <Text style={styles.buttonText}>
              {isRegistering ? 'Registering...' : 'Register'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login', { email })}
          >
            <Text style={styles.linkText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1a1716' },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#ffc803', marginBottom: 4, letterSpacing: 0.3 },
  subtitle: { fontSize: 14, color: '#a09890', marginBottom: 32 },
  label: { fontSize: 13, color: '#a09890', marginBottom: 6, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderColor: '#332e2b', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 15,
    backgroundColor: '#1f1b1a', color: '#fff', marginBottom: 16,
  },
  button: { backgroundColor: '#ffc803', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#1a1716', fontSize: 16, fontWeight: '700' },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#ffc803', fontSize: 14 },
});