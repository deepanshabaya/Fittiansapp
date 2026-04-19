import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../navigation/AppNavigator';
import {
  postponeDailySession,
  cancelDailySession,
  pauseSessions,
  fetchCustomerDashboard,
} from '../services/api';

// Returns tomorrow's date in YYYY-MM-DD.
function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Midnight today in local time — used as the strict lower bound for action dates.
function todayStartLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Validate a YYYY-MM-DD string. Returns null if the date is strictly after today,
// otherwise an error message. Catches malformed input and past/today dates.
function validateFutureDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return 'Please enter a valid date in YYYY-MM-DD format.';
  }
  const [y, m, d] = value.trim().split('-').map(Number);
  const picked = new Date(y, m - 1, d);
  if (
    Number.isNaN(picked.getTime()) ||
    picked.getFullYear() !== y ||
    picked.getMonth() !== m - 1 ||
    picked.getDate() !== d
  ) {
    return 'Please enter a valid calendar date.';
  }
  if (picked <= todayStartLocal()) {
    return 'Date must be after today.';
  }
  return null;
}

export default function SessionManagementScreen() {
  const { token, customerId } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [postponeLimit, setPostponeLimit] = useState(2);
  const [sessionsPostponed, setSessionsPostponed] = useState(0);
  const [sessionsCancelled, setSessionsCancelled] = useState(0);

  const [postponeDate, setPostponeDate] = useState(tomorrowISO());
  const [cancelDate, setCancelDate] = useState(tomorrowISO());
  const [pauseUntilDate, setPauseUntilDate] = useState('');
  const [reason, setReason] = useState('');

  const [submittingPostpone, setSubmittingPostpone] = useState(false);
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [submittingPause, setSubmittingPause] = useState(false);

  const loadData = useCallback(async () => {
    if (!token || !customerId) return;
    try {
      const dash = await fetchCustomerDashboard({ token, customerId });
      setPostponeLimit(dash.postpone_limit ?? 2);
      setSessionsPostponed(dash.sessions_postponed ?? 0);
      setSessionsCancelled(dash.sessions_cancelled ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, customerId]);

  useEffect(() => { loadData(); }, [loadData]);

  const ensureAuth = () => {
    if (!token || !customerId) {
      Alert.alert('Not ready', 'Missing token or customer id.');
      return false;
    }
    return true;
  };

  const handlePostpone = async () => {
    if (!ensureAuth()) return;
    if (sessionsPostponed >= postponeLimit) {
      Alert.alert('Limit reached', 'You have reached your postpone limit');
      return;
    }
    const dateErr = validateFutureDate(postponeDate);
    if (dateErr) {
      Alert.alert('Invalid date', dateErr);
      return;
    }
    setSubmittingPostpone(true);
    try {
      const res = await postponeDailySession({ token, session_date: postponeDate });
      setSessionsPostponed(res.sessions_postponed ?? sessionsPostponed + 1);
      Alert.alert('Success', 'Session postponed.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to postpone session');
    } finally {
      setSubmittingPostpone(false);
    }
  };

  const handleCancel = async () => {
    if (!ensureAuth()) return;
    const dateErr = validateFutureDate(cancelDate);
    if (dateErr) {
      Alert.alert('Invalid date', dateErr);
      return;
    }
    setSubmittingCancel(true);
    try {
      const res = await cancelDailySession({ token, session_date: cancelDate });
      setSessionsCancelled(res.sessions_cancelled ?? sessionsCancelled + 1);
      Alert.alert('Success', 'Session cancelled.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to cancel session');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handlePause = async () => {
    if (!ensureAuth()) return;
    if (!reason.trim()) {
      Alert.alert('Missing fields', 'Please enter a reason.');
      return;
    }
    const dateErr = validateFutureDate(pauseUntilDate);
    if (dateErr) {
      Alert.alert('Invalid date', dateErr);
      return;
    }
    setSubmittingPause(true);
    try {
      await pauseSessions({ pauseUntilDate, reason, token });
      Alert.alert('Requested', 'Pause request submitted.');
      setPauseUntilDate('');
      setReason('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit pause request');
    } finally {
      setSubmittingPause(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#ffc803" />
        </View>
      </SafeAreaView>
    );
  }

  const limitReached = sessionsPostponed >= postponeLimit;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1716" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Session Management</Text>

          {/* Summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Postponed Sessions</Text>
              <Text style={[styles.summaryValue, limitReached && { color: '#EF4444' }]}>
                {sessionsPostponed} / {postponeLimit}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cancelled Sessions</Text>
              <Text style={styles.summaryValue}>{sessionsCancelled}</Text>
            </View>
          </View>

          {/* Postpone card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Postpone Session</Text>
            <Text style={styles.meta}>
              Must be done before 8 PM of previous day.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Session date (YYYY-MM-DD)"
              placeholderTextColor="#6b6360"
              value={postponeDate}
              onChangeText={setPostponeDate}
            />
            <TouchableOpacity
              style={[styles.button, (limitReached || submittingPostpone) && styles.buttonDisabled]}
              onPress={handlePostpone}
              disabled={limitReached || submittingPostpone}
              activeOpacity={0.8}
            >
              {submittingPostpone ? (
                <ActivityIndicator color="#1a1716" />
              ) : (
                <Text style={styles.buttonText}>
                  {limitReached ? 'Limit Reached' : 'Postpone Session'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Cancel card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Cancel Session</Text>
            <Text style={styles.meta}>
              Must be done before 8 PM of previous day.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Session date (YYYY-MM-DD)"
              placeholderTextColor="#6b6360"
              value={cancelDate}
              onChangeText={setCancelDate}
            />
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, submittingCancel && styles.buttonDisabled]}
              onPress={handleCancel}
              disabled={submittingCancel}
              activeOpacity={0.8}
            >
              {submittingCancel ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel Session</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Pause program card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pause Program</Text>
            <TextInput
              style={styles.input}
              placeholder="Pause until date (YYYY-MM-DD)"
              placeholderTextColor="#6b6360"
              value={pauseUntilDate}
              onChangeText={setPauseUntilDate}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Reason"
              placeholderTextColor="#6b6360"
              multiline
              numberOfLines={3}
              value={reason}
              onChangeText={setReason}
            />
            <TouchableOpacity
              style={[styles.button, submittingPause && styles.buttonDisabled]}
              onPress={handlePause}
              disabled={submittingPause}
              activeOpacity={0.8}
            >
              {submittingPause ? (
                <ActivityIndicator color="#1a1716" />
              ) : (
                <Text style={styles.buttonText}>Submit Pause Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1a1716' },
  flex: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contentContainer: { paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#ffc803', marginBottom: 20, letterSpacing: 0.3 },
  summaryCard: {
    backgroundColor: '#252120', borderRadius: 16, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: '#332e2b',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summaryLabel: { fontSize: 14, color: '#a09890' },
  summaryValue: { fontSize: 16, color: '#ffc803', fontWeight: '700' },
  card: {
    backgroundColor: '#252120', borderRadius: 16, padding: 20,
    marginBottom: 24, borderWidth: 1, borderColor: '#332e2b',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 6 },
  meta: { fontSize: 13, color: '#a09890', marginBottom: 14 },
  input: {
    borderWidth: 1, borderColor: '#332e2b', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    backgroundColor: '#1f1b1a', color: '#fff', marginBottom: 14,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  button: { backgroundColor: '#ffc803', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#1a1716', fontSize: 16, fontWeight: '700' },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#ef4444' },
  secondaryButtonText: { color: '#ef4444', fontWeight: '700' },
});
