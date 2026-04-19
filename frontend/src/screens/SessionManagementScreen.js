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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../navigation/AppNavigator';
import Card from '../components/Card';
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

// Parse "YYYY-MM-DD" to a nice "Tomorrow · 20 Apr" style label.
function formatUpcomingDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const picked = new Date(y, m - 1, d);
  const today = todayStartLocal();
  const diff = Math.round((picked - today) / (1000 * 60 * 60 * 24));
  const dayLabel = picked.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  if (diff === 1) return `Tomorrow · ${dayLabel}`;
  if (diff === 0) return `Today · ${dayLabel}`;
  return dayLabel;
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

  const handleRenewPlan = () => {
    Alert.alert('Renew Plan', 'Plan renewal will be available soon.');
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
  const postponeRemaining = Math.max(postponeLimit - sessionsPostponed, 0);

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
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Sessions</Text>
            <View style={styles.headerIconWrap}>
              <Ionicons name="calendar-outline" size={20} color="#ffc803" />
            </View>
          </View>

          {/* ── 1. Upcoming Session Card ── */}
          <Text style={styles.sectionHeading}>Upcoming Session</Text>
          <Card style={styles.upcomingCard}>
            <View style={styles.upcomingLeft}>
              <View style={styles.upcomingBadge}>
                <Ionicons name="time-outline" size={12} color="#ffc803" />
                <Text style={styles.upcomingBadgeText}>Next</Text>
              </View>
              <Text style={styles.upcomingDate}>{formatUpcomingDate(tomorrowISO())}</Text>
              <Text style={styles.upcomingTime}>7:00 AM</Text>
              <View style={styles.upcomingMetaRow}>
                <Ionicons name="person-outline" size={13} color="#b3b3b3" />
                <Text style={styles.upcomingMeta}>With your trainer</Text>
              </View>
            </View>
            <View style={styles.upcomingRight}>
              <Ionicons name="fitness" size={40} color="#ffc803" />
            </View>
          </Card>

          {/* ── 2. Session Summary ── */}
          <Text style={styles.sectionHeading}>Session Summary</Text>
          <View style={styles.summaryRow}>
            <Card style={styles.summaryBox}>
              <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(255,200,3,0.12)' }]}>
                <Ionicons name="pause-circle" size={18} color="#ffc803" />
              </View>
              <Text style={[styles.summaryValue, limitReached && { color: '#ef4444' }]}>
                {sessionsPostponed}
                <Text style={styles.summaryOf}>/{postponeLimit}</Text>
              </Text>
              <Text style={styles.summaryLabel}>Postponed</Text>
              <Text style={styles.summaryHint}>
                {limitReached ? 'Limit reached' : `${postponeRemaining} left`}
              </Text>
            </Card>
            <View style={{ width: 12 }} />
            <Card style={styles.summaryBox}>
              <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                <Ionicons name="close-circle" size={18} color="#ef4444" />
              </View>
              <Text style={styles.summaryValue}>{sessionsCancelled}</Text>
              <Text style={styles.summaryLabel}>Cancelled</Text>
              <Text style={styles.summaryHint}>All-time</Text>
            </Card>
          </View>

          {/* ── 3. Manage Sessions ── */}
          <Text style={styles.sectionHeading}>Manage Sessions</Text>

          {/* Postpone */}
          <Card style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(255,200,3,0.12)' }]}>
                <Ionicons name="calendar" size={18} color="#ffc803" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Postpone Session</Text>
                <Text style={styles.actionSub}>Before 8 PM of previous day</Text>
              </View>
            </View>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6b6360"
              value={postponeDate}
              onChangeText={setPostponeDate}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, (limitReached || submittingPostpone) && styles.btnDisabled]}
              onPress={handlePostpone}
              disabled={limitReached || submittingPostpone}
              activeOpacity={0.85}
            >
              {submittingPostpone ? (
                <ActivityIndicator color="#1a1716" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {limitReached ? 'Limit Reached' : 'Postpone Session'}
                </Text>
              )}
            </TouchableOpacity>
          </Card>

          {/* Cancel */}
          <Card style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                <Ionicons name="close-circle" size={18} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Cancel Session</Text>
                <Text style={styles.actionSub}>Before 8 PM of previous day</Text>
              </View>
            </View>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6b6360"
              value={cancelDate}
              onChangeText={setCancelDate}
            />
            <TouchableOpacity
              style={[styles.ghostBtn, submittingCancel && styles.btnDisabled]}
              onPress={handleCancel}
              disabled={submittingCancel}
              activeOpacity={0.85}
            >
              {submittingCancel ? (
                <ActivityIndicator color="#ef4444" />
              ) : (
                <Text style={styles.ghostBtnText}>Cancel Session</Text>
              )}
            </TouchableOpacity>
          </Card>

          {/* Pause */}
          <Card style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(255,200,3,0.12)' }]}>
                <Ionicons name="pause-outline" size={18} color="#ffc803" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Pause Program</Text>
                <Text style={styles.actionSub}>Request approval from your trainer</Text>
              </View>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Pause until (YYYY-MM-DD)"
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
              style={[styles.primaryBtn, submittingPause && styles.btnDisabled]}
              onPress={handlePause}
              disabled={submittingPause}
              activeOpacity={0.85}
            >
              {submittingPause ? (
                <ActivityIndicator color="#1a1716" />
              ) : (
                <Text style={styles.primaryBtnText}>Submit Pause Request</Text>
              )}
            </TouchableOpacity>
          </Card>

          {/* ── 4. Renew Plan CTA ── */}
          <TouchableOpacity
            style={styles.renewBtn}
            onPress={handleRenewPlan}
            activeOpacity={0.85}
          >
            <Text style={styles.renewBtnText}>Renew Plan</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1a1716' },
  flex: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contentContainer: { paddingHorizontal: 20, paddingTop: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    marginTop: 4,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#242120',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2e2a28',
  },

  sectionHeading: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
    letterSpacing: 0.2,
  },

  // Upcoming session card
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginBottom: 18,
  },
  upcomingLeft: { flex: 1 },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,200,3,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  upcomingBadgeText: {
    color: '#ffc803',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  upcomingDate: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  upcomingTime: {
    color: '#ffc803',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  upcomingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  upcomingMeta: {
    color: '#b3b3b3',
    fontSize: 12,
    fontWeight: '500',
  },
  upcomingRight: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: 'rgba(255,200,3,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
  },

  // Summary boxes
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  summaryBox: {
    flex: 1,
    padding: 16,
    alignItems: 'flex-start',
  },
  summaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  summaryOf: {
    color: '#b3b3b3',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryLabel: {
    color: '#b3b3b3',
    fontSize: 12,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryHint: {
    color: '#6b6360',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },

  // Action cards
  actionCard: { marginBottom: 14, padding: 16 },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  actionSub: {
    color: '#b3b3b3',
    fontSize: 12,
    marginTop: 2,
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: '#2e2a28',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#1a1716',
    color: '#ffffff',
    marginBottom: 12,
  },
  textArea: { height: 90, textAlignVertical: 'top' },

  // Buttons
  primaryBtn: {
    backgroundColor: '#ffc803',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#1a1716',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  ghostBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  ghostBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  btnDisabled: { opacity: 0.5 },

  // Renew CTA
  renewBtn: {
    backgroundColor: '#ffc803',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#ffc803',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  renewBtnText: {
    color: '#1a1716',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
