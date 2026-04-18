import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// FIX: Use safe-area-context SafeAreaView for reliable cross-platform insets.
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../navigation/AppNavigator';
import { fetchMyTrainerProfile } from '../services/api';

export default function TrainerVerificationScreen() {
  const { token, setIsApproved, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheckApproval = async () => {
    if (!token) {
      Alert.alert('Session expired', 'Please login again.');
      logout();
      return;
    }

    try {
      setChecking(true);
      const data = await fetchMyTrainerProfile({ token });

      if (data.trainer && data.trainer.is_approved) {
        // Trainer has been approved! Update state → AppNavigator auto-switches to AppTabs
        setIsApproved(true);
        await AsyncStorage.setItem('isApproved', 'true');
        Alert.alert('Approved! 🎉', 'Your trainer profile has been approved. Welcome!');
      } else {
        Alert.alert(
          'Still Pending',
          'Your profile is still awaiting admin approval. Please check back later.'
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to check approval status');
    } finally {
      setChecking(false);
    }
  };

  return (
    // FIX: This is a standalone auth screen (no tab bar), so protect all four
    // edges. The centered content uses flex layout so it auto-adapts to the
    // available space within the safe insets on any device.
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <View style={styles.container}>
        <Text style={styles.icon}>⏳</Text>
        <Text style={styles.title}>Verification Pending</Text>
        <Text style={styles.subtitle}>
          Your trainer profile is under review.{'\n'}
          An admin will approve your account shortly.
        </Text>

        <TouchableOpacity
          style={[styles.button, checking && styles.buttonDisabled]}
          onPress={handleCheckApproval}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Check Approval Status</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // FIX: safeArea with flex:1 and backgroundColor ensures the status bar area
  // and bottom home indicator zone both show the correct background color.
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 16,
    minWidth: 240,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '500',
  },
});