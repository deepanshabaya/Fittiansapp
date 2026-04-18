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
  fetchCustomerProgramSummary,
} from '../services/api';

// Returns tomorrow's date in YYYY-MM-DD.
function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
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
  const [programId, setProgramId] = useState(null);

  const [submittingPostpone, setSubmittingPostpone] = useState(false);
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [submittingPause, setSubmittingPause] = useState(false);

  const loadData = useCallback(async () => {
    if (!token || !customerId) return;
    try {
      const [dash, programs] = await Promise.allSettled([
        fetchCustomerDashboard({ token, customerId }),
        fetchCustomerProgramSummary({ customerId, token }),
      ]);
      if (dash.status === 'fulfilled') {
        setPostponeLimit(dash.value.postpone_limit ?? 2);
        setSessionsPostponed(dash.value.sessions_postponed ?? 0);
        setSessionsCancelled(dash.value.sessions_cancelled ?? 0);
      }
      if (programs.status === 'fulfilled' && programs.value.programs?.length > 0) {
        setProgramId(programs.value.programs[0].program_id || programs.value.programs[0].id || null);
      }
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
    if (!postponeDate) {
      Alert.alert('Missing date', 'Please enter the session date.');
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
    if (!cancelDate) {
      Alert.alert('Missing date', 'Please enter the session date.');
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
    if (!pauseUntilDate || !reason) {
      Alert.alert('Missing fields', 'Please enter pause until date and reason.');
      return;
    }
    if (!programId) {
      Alert.alert('No program', 'No active program found to pause.');
      return;
    }
    setSubmittingPause(true);
    try {
      await pauseSessions({ programId, pauseUntilDate, reason, token });
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
          <ActivityIndicator size="large" color="#FFC107" />
        </View>
      </SafeAreaView>
    );
  }

  const limitReached = sessionsPostponed >= postponeLimit;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
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
              placeholderTextColor="#A0A0A0"
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
                <ActivityIndicator color="#121212" />
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
              placeholderTextColor="#A0A0A0"
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
              placeholderTextColor="#A0A0A0"
              value={pauseUntilDate}
              onChangeText={setPauseUntilDate}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Reason"
              placeholderTextColor="#A0A0A0"
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
                <ActivityIndicator color="#121212" />
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
  safeArea: { flex: 1, backgroundColor: '#121212' },
  flex: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contentContainer: { paddingHorizontal: 24, paddingTop: 24 },
  title: {
    fontSize: 28, fontWeight: '800', color: '#FFC107',
    marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1.1,
  },
  summaryCard: {
    backgroundColor: '#1F1F1F', borderRadius: 16, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: '#333',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 6,
  },
  summaryLabel: { fontSize: 14, color: '#B0B0B0' },
  summaryValue: { fontSize: 16, color: '#FFC107', fontWeight: '700' },
  card: {
    backgroundColor: '#1F1F1F', borderRadius: 20, padding: 20,
    marginBottom: 24, borderWidth: 1, borderColor: '#333333',
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 6 },
  meta: { fontSize: 13, color: '#B0B0B0', marginBottom: 14 },
  input: {
    borderWidth: 1, borderColor: '#444', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    backgroundColor: '#121212', color: '#FFF', marginBottom: 14,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  button: {
    backgroundColor: '#FFC107', paddingVertical: 16, borderRadius: 30,
    alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#121212', fontSize: 18, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: 'transparent', borderWidth: 2, borderColor: '#EF4444',
  },
  secondaryButtonText: { color: '#EF4444', fontWeight: '700' },
});
