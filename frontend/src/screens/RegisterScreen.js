import React, { useState, useEffect } from 'react';
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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../navigation/AppNavigator';
import {
  register as registerApi,
  fetchLatestTerms,
  recordUserAgreement,
} from '../services/api';

export default function RegisterScreen({ navigation, route }) {
  const { login } = useAuth();
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState(route.params?.email || '');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Terms state
  const [terms, setTerms] = useState(null);
  const [termsLoading, setTermsLoading] = useState(true);
  const [termsError, setTermsError] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await fetchLatestTerms();
        if (!cancelled) setTerms(t);
      } catch (err) {
        if (!cancelled) setTermsError(err.message || 'Unable to load terms');
      } finally {
        if (!cancelled) setTermsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const canSubmit =
    mobile.trim() && email.trim() && password && termsAccepted && !isRegistering;

  const handleRegister = async () => {
    if (!mobile || !email || !password) {
      Alert.alert('Missing fields', 'Please fill all fields.');
      return;
    }
    if (!/^\d{10,15}$/.test(mobile.trim())) {
      Alert.alert('Invalid mobile', 'Mobile must be 10–15 digits.');
      return;
    }
    if (!termsAccepted) {
      Alert.alert(
        'Terms required',
        'Please review and accept the Terms & Conditions to continue.'
      );
      return;
    }
    if (!terms?.version) {
      Alert.alert(
        'Terms unavailable',
        'Terms & Conditions could not be loaded. Please retry.'
      );
      return;
    }

    try {
      setIsRegistering(true);
      const data = await registerApi({
        mobile: mobile.trim(),
        email: email.trim(),
        password,
      });

      // Record agreement server-side for customers only. Trainers/admins
      // bypass this step per product spec. Non-blocking: if the agreement
      // call fails, registration has already succeeded and we log instead
      // of surfacing a second error on top of a success.
      if (data?.user?.role === 'customer' && data?.token) {
        try {
          await recordUserAgreement({
            token: data.token,
            type: 'terms',
            version: terms.version,
          });
        } catch (agreementErr) {
          console.log('[REGISTER] agreement record failed:', agreementErr.message);
        }
      }

      const requiresApproval = data.requiresApproval || false;
      await login({ user: data.user, token: data.token, requiresApproval });

      if (requiresApproval) {
        Alert.alert('Registered!', 'Your profile is pending admin approval.');
        navigation.replace('TrainerVerification');
      } else {
        Alert.alert('Success', 'Registration completed!');
      }
    } catch (err) {
      Alert.alert('Registration failed', err.message || 'Unable to register');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1716" />
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
            placeholderTextColor="#6b6360"
            keyboardType="phone-pad"
            maxLength={15}
            value={mobile}
            onChangeText={setMobile}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#6b6360"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••"
            placeholderTextColor="#6b6360"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Terms & Conditions row */}
          <View style={styles.termsWrap}>
            <TouchableOpacity
              style={styles.termsCheckRow}
              onPress={() => setTermsAccepted((v) => !v)}
              activeOpacity={0.7}
              disabled={termsLoading || !!termsError}
            >
              <View
                style={[
                  styles.checkbox,
                  termsAccepted && styles.checkboxChecked,
                ]}
              >
                {termsAccepted && (
                  <Ionicons name="checkmark" size={16} color="#1a1716" />
                )}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => setTermsVisible(true)}
                >
                  Terms &amp; Conditions
                </Text>
              </Text>
            </TouchableOpacity>

            {termsLoading && (
              <Text style={styles.termsHint}>Loading terms…</Text>
            )}
            {termsError && (
              <Text style={styles.termsErrorText}>
                Couldn’t load terms: {termsError}
              </Text>
            )}
            {!termsLoading && !termsError && terms?.version && (
              <Text style={styles.termsHint}>
                Version {terms.version} · Tap the link to read
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {isRegistering ? (
              <ActivityIndicator color="#1a1716" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login', { email })}
          >
            <Text style={styles.linkText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms modal */}
      <Modal
        visible={termsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTermsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms &amp; Conditions</Text>
              {terms?.version ? (
                <Text style={styles.modalVersion}>v{terms.version}</Text>
              ) : null}
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {termsLoading ? (
                <ActivityIndicator color="#ffc803" />
              ) : termsError ? (
                <Text style={styles.modalBodyText}>
                  Unable to load terms: {termsError}
                </Text>
              ) : (
                <Text style={styles.modalBodyText}>
                  {terms?.content || 'No terms available.'}
                </Text>
              )}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setTermsVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnGhostText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => {
                  setTermsAccepted(true);
                  setTermsVisible(false);
                }}
                activeOpacity={0.85}
                disabled={termsLoading || !!termsError}
              >
                <Text style={styles.modalBtnPrimaryText}>I Agree</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1a1716' },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffc803',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  subtitle: { fontSize: 14, color: '#a09890', marginBottom: 32 },
  label: {
    fontSize: 13,
    color: '#a09890',
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#332e2b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    backgroundColor: '#1f1b1a',
    color: '#fff',
    marginBottom: 16,
  },

  // Terms row
  termsWrap: { marginTop: 4, marginBottom: 20 },
  termsCheckRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#6b6360',
    backgroundColor: '#1f1b1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: { backgroundColor: '#ffc803', borderColor: '#ffc803' },
  termsText: { color: '#fff', fontSize: 14, flexShrink: 1 },
  termsLink: { color: '#ffc803', fontWeight: '700', textDecorationLine: 'underline' },
  termsHint: { color: '#6b6360', fontSize: 12, marginTop: 6, marginLeft: 32 },
  termsErrorText: { color: '#ef4444', fontSize: 12, marginTop: 6, marginLeft: 32 },

  button: {
    backgroundColor: '#ffc803',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 52,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#1a1716', fontSize: 16, fontWeight: '700' },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#ffc803', fontSize: 14 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalSheet: {
    backgroundColor: '#252120',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#332e2b',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: { color: '#ffc803', fontSize: 18, fontWeight: '800' },
  modalVersion: {
    color: '#ffc803',
    backgroundColor: 'rgba(255,200,3,0.10)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
  },
  modalBody: { maxHeight: 380, marginBottom: 14 },
  modalBodyText: { color: '#e0dcd7', fontSize: 14, lineHeight: 20 },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGhost: {
    backgroundColor: '#1f1b1a',
    borderWidth: 1,
    borderColor: '#332e2b',
  },
  modalBtnGhostText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalBtnPrimary: { backgroundColor: '#ffc803' },
  modalBtnPrimaryText: { color: '#1a1716', fontSize: 15, fontWeight: '700' },
});
