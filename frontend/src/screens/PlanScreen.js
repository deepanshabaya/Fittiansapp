import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../navigation/AppNavigator';
import Card from '../components/Card';
import InfoRow from '../components/InfoRow';
import { fetchCustomerDashboard } from '../services/api';

const PROGRAM_LABELS = {
  my_home_coach: 'My Home Coach',
  my_home_coach_couple: 'My Home Coach — Couple',
  fit_mentor_program: 'Fit Mentor Program',
  disease_reversal_program: 'Disease Reversal Program',
};

function formatProgram(key) {
  if (!key) return 'Fitness Program';
  return PROGRAM_LABELS[key] || String(key).replace(/_/g, ' ');
}

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function formatAmount(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `\u20B9${n.toLocaleString('en-IN')}`;
}

export default function PlanScreen() {
  const { token, customerId } = useAuth();
  const insets = useSafeAreaInsets();

  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || !customerId) return;
    try {
      setLoading(true);
      const data = await fetchCustomerDashboard({ token, customerId });
      setDash(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  }, [token, customerId]);

  useEffect(() => { load(); }, [load]);

  const handleRenew = () => {
    Alert.alert('Renew Plan', 'Plan renewal will be available soon.');
  };

  if (loading && !dash) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#ffc803" />
        </View>
      </SafeAreaView>
    );
  }

  const programName = formatProgram(dash?.customer_details?.program_enrolled);
  const amount = formatAmount(dash?.amount_paid ?? dash?.customer_details?.amount_paid);
  const totalSessions = Number(dash?.total_sessions ?? dash?.customer_details?.total_sessions ?? 0);
  const doneSessions = Number(dash?.sessions_completed ?? 0);
  const remaining = Math.max(totalSessions - doneSessions, 0);
  const progressPct = totalSessions > 0
    ? Math.min(Math.round((doneSessions / totalSessions) * 100), 100)
    : 0;
  const startDate = formatDate(dash?.start_date ?? dash?.customer_details?.start_date);
  const pause = dash?.pause_request || null; // optional, only rendered if present

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1716" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#ffc803" />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Plan</Text>
          <View style={styles.headerIconWrap}>
            <Ionicons name="ribbon-outline" size={20} color="#ffc803" />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* ── 1. Plan Card (program name + amount + progress) ── */}
        <Card style={styles.planCard}>
          <View style={styles.planTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>{programName}</Text>
              <Text style={styles.planMeta}>Membership Plan</Text>
            </View>
            {amount ? (
              <View style={styles.amountChip}>
                <Text style={styles.amountChipText}>{amount}</Text>
              </View>
            ) : null}
          </View>

          {/* 2. Progress Bar */}
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressPct}>{progressPct}%</Text>
              <Text style={styles.progressSessions}>
                {doneSessions} / {totalSessions} sessions
              </Text>
            </View>
          </View>
        </Card>

        {/* ── 3. Session Info ── */}
        <View style={styles.statsRow}>
          <Card style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
            </View>
            <Text style={styles.statValue}>{doneSessions}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </Card>
          <View style={{ width: 12 }} />
          <Card style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(255,200,3,0.12)' }]}>
              <Ionicons name="flash" size={18} color="#ffc803" />
            </View>
            <Text style={[styles.statValue, { color: '#ffc803' }]}>{remaining}</Text>
            <Text style={styles.statLabel}>
              {remaining === 1 ? 'Session Left' : 'Sessions Left'}
            </Text>
          </Card>
        </View>

        {remaining <= 1 && totalSessions > 0 ? (
          <View style={styles.warnBanner}>
            <Ionicons name="alert-circle" size={16} color="#1a1716" />
            <Text style={styles.warnBannerText}>
              {remaining === 0 ? 'Plan expired — renew to continue' : '1 session left — renew your plan'}
            </Text>
          </View>
        ) : null}

        {/* ── 4. Plan Details ── */}
        <Text style={styles.sectionHeading}>Plan Details</Text>
        <Card>
          <InfoRow label="Program" value={programName} />
          <InfoRow label="Amount Paid" value={amount || '—'} />
          <InfoRow label="Total Sessions" value={totalSessions || '—'} />
          <InfoRow label="Start Date" value={startDate || '—'} last />
        </Card>

        {/* ── 5. Pause Request (only if present) ── */}
        {pause ? (
          <>
            <Text style={styles.sectionHeading}>Pause Request</Text>
            <Card style={styles.pauseCard}>
              <View style={styles.pauseIconWrap}>
                <Ionicons name="pause-circle" size={20} color="#ffc803" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pauseTitle}>
                  Pause Until: <Text style={styles.pauseDate}>{formatDate(pause.until_date) || '—'}</Text>
                </Text>
                <Text style={styles.pauseSub}>{pause.reason || 'Status'}</Text>
              </View>
              <View style={[styles.statusBadge, badgeStyle(pause.status)]}>
                <Text style={[styles.statusBadgeText, badgeTextStyle(pause.status)]}>
                  {prettyStatus(pause.status)}
                </Text>
              </View>
            </Card>
          </>
        ) : null}

        {/* ── 6. Renew Plan CTA ── */}
        <TouchableOpacity style={styles.renewBtn} onPress={handleRenew} activeOpacity={0.85}>
          <Text style={styles.renewBtnText}>Renew Plan</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function prettyStatus(s) {
  if (!s) return 'Pending';
  const v = String(s).toLowerCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function badgeStyle(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'approved') return { backgroundColor: 'rgba(34,197,94,0.14)', borderColor: '#22c55e' };
  if (v === 'rejected') return { backgroundColor: 'rgba(239,68,68,0.14)', borderColor: '#ef4444' };
  return { backgroundColor: 'rgba(255,200,3,0.14)', borderColor: '#ffc803' };
}

function badgeTextStyle(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'approved') return { color: '#22c55e' };
  if (v === 'rejected') return { color: '#ef4444' };
  return { color: '#ffc803' };
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1a1716' },
  flex: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 16 },

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

  error: { color: '#ef4444', marginBottom: 12, fontSize: 13 },

  // Plan card
  planCard: { marginBottom: 18, padding: 18 },
  planTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  planName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  planMeta: {
    color: '#b3b3b3',
    fontSize: 12,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  amountChip: {
    backgroundColor: 'rgba(255,200,3,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,200,3,0.3)',
  },
  amountChipText: {
    color: '#ffc803',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Progress bar
  progressWrap: { marginTop: 18 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a1716',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2e2a28',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffc803',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  progressPct: {
    color: '#ffc803',
    fontSize: 13,
    fontWeight: '800',
  },
  progressSessions: {
    color: '#b3b3b3',
    fontSize: 12,
    fontWeight: '600',
  },

  // Stat boxes
  statsRow: { flexDirection: 'row', marginBottom: 14 },
  statBox: { flex: 1, padding: 16, alignItems: 'flex-start' },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statLabel: {
    color: '#b3b3b3',
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Warning banner
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffc803',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  warnBannerText: {
    color: '#1a1716',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },

  sectionHeading: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
    letterSpacing: 0.2,
  },

  // Pause card
  pauseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  pauseIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,200,3,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseTitle: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  pauseDate: { color: '#ffc803', fontWeight: '800' },
  pauseSub: { color: '#b3b3b3', fontSize: 12, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Renew CTA
  renewBtn: {
    backgroundColor: '#ffc803',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 18,
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
