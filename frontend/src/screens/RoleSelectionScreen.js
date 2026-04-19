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
// FIX: Use safe-area-context SafeAreaView for correct platform handling.
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkUserExists } from '../services/api';

export default function RoleSelectionScreen({ navigation }) {
  const { setRole } = useAuth();
  const [email, setEmail] = useState('');

  const handleSelect = async (selectedRole) => {
    // Save the selected role
    setRole(selectedRole);
    await AsyncStorage.setItem('userRole', selectedRole);

    // If no email entered, go straight to Login (user can enter email there)
    if (!email.trim()) {
      navigation.navigate('Login');
      return;
    }

    try {
      const exists = await checkUserExists({ email: email.trim(), role: selectedRole });
      if (exists) {
        navigation.navigate('Login', { email: email.trim() });
      } else {
        navigation.navigate('Register', { email: email.trim() });
      }
    } catch (err) {
      // If check-user fails (e.g. network), default to Login screen
      Alert.alert('Note', 'Could not check user existence. Redirecting to login.');
      navigation.navigate('Login', { email: email.trim() });
    }
  };

  return (
    // FIX: This is a standalone auth screen with no tab bar, so we protect all
    // four edges. The centered layout with justifyContent:'center' also needs
    // the bottom inset respected so buttons don't sit on the home indicator.
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1716" />
      {/*
        FIX: Wrapped in KeyboardAvoidingView + ScrollView so the role buttons
        stay reachable when the email input is focused and the keyboard opens.
        Previously, pressing the email field would push the buttons off screen.
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
          <Text style={styles.title}>Welcome to Fittians</Text>
          <Text style={styles.subtitle}>Select your role to continue</Text>

          <Text style={styles.label}>Email (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TouchableOpacity style={styles.button} onPress={() => handleSelect('trainer')}>
            <Text style={styles.buttonText}>I am a Trainer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => handleSelect('customer')}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>I am a Customer</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1a1716' },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#ffc803', marginBottom: 8, letterSpacing: 0.3 },
  subtitle: { fontSize: 15, color: '#a09890', marginBottom: 24 },
  label: { fontSize: 13, color: '#a09890', marginBottom: 6, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderColor: '#332e2b', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 15,
    backgroundColor: '#1f1b1a', color: '#fff', marginBottom: 24,
  },
  button: { backgroundColor: '#ffc803', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#1a1716', fontSize: 16, fontWeight: '700' },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#ffc803' },
  secondaryButtonText: { color: '#ffc803' },
});