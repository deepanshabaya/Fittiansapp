import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../navigation/AppNavigator';
import { fetchAttendance, fetchCustomerProgramSummary } from '../services/api';
import SessionCard from '../components/SessionCard';

export default function AttendanceScreen() {
  const { token, customerId, role } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  // FIX: useSafeAreaInsets gives us the exact pixel values for all four edges at
  // runtime, accounting for the bottom tab navigator height automatically.
  const insets = useSafeAreaInsets();

  const loadAttendance = async () => {
    if (role !== 'customer') return;
    if (!customerId || !token) {
      Alert.alert('Missing data', 'Customer id or token missing.');
      return;
    }
    try {
      setLoading(true);
      const [attData, sumData] = await Promise.all([
        fetchAttendance({ customerId, token }),
        fetchCustomerProgramSummary({ customerId, token }),
      ]);
      setAttendance(attData.attendance || []);
      if (sumData.programs && sumData.programs.length > 0) {
        setSummary(sumData.programs[0]);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [customerId, token]);

  const completedSessions = attendance.length;
  const totalSessions = summary?.total_sessions || completedSessions || 0;
  const remaining = Math.max(totalSessions - completedSessions, 0);

  useEffect(() => {
    if (remaining === 1 && totalSessions > 0) {
      Alert.alert('One session left', 'You have 1 session left. Please recharge.');
    }
  }, [remaining, totalSessions]);

  return (
    // FIX: edges={['top']} — only apply safe area padding on the top edge here.
    // The bottom tab navigator renders its own bottom safe area padding, so
    // applying 'bottom' here would double-stack it, creating a large gap.
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1716" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          // FIX: Dynamic paddingBottom using insets instead of hardcoded 80.
          // insets.bottom == 0 on Android with hardware back button (no bar),
          // ~34 on iPhone with home indicator, ~20 on standard Android gesture nav.
          // Adding 24 gives comfortable breathing room above the tab bar.
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAttendance} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Attendance</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            {completedSessions} / {totalSessions || '—'} sessions completed
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Session History</Text>
        {attendance.length > 0 ? (
          attendance.map(item => (
            <SessionCard key={item.id} session={item} />
          ))
        ) : (
          <Text style={styles.empty}>No attendance records yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1a1716' },
  container: { flex: 1, backgroundColor: '#1a1716' },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#ffc803', marginBottom: 16, letterSpacing: 0.3 },
  summaryCard: {
    backgroundColor: '#252120', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#332e2b',
  },
  summaryText: { fontSize: 16, fontWeight: '700', color: '#ffc803' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 8, marginTop: 4 },
  empty: { fontSize: 14, color: '#6b6360', marginTop: 8 },
});