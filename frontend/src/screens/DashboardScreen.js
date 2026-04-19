import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../navigation/AppNavigator';
import * as ImagePicker from 'expo-image-picker';
import {
  fetchTrainerForCustomer,
  fetchMyCustomers,
  updateCustomerHealth,
  fetchCustomerDashboard,
  markSession,
  addProgress,
  fetchLatestProgress,
  syncSteps,
  fetchTodaySessions,
  avatarUri,
} from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import TrainerCard from '../components/TrainerCard';
import Card from '../components/Card';
import StatBox from '../components/StatBox';
import SectionTitle from '../components/SectionTitle';
import SessionItem from '../components/SessionItem';
import { isStepCountAvailable, requestStepPermission, getTodaySteps } from '../utils/stepCounter';

// ─── Option lists ────────────────────────────────────────
const DAILY_ROUTINE_OPTS = ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'];
const FITNESS_GOAL_OPTS = ['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness', 'disease_management'];
const SMOKING_OPTS = ['never', 'occasional', 'regular', 'former'];
const ALCOHOL_OPTS = ['never', 'rarely', 'occasionally', 'weekly', 'daily'];
const DIET_OPTS = ['vegetarian', 'vegan', 'non_vegetarian', 'eggetarian', 'jain'];
const PROGRAM_OPTS = ['my_home_coach', 'my_home_coach_couple', 'fit_mentor_program', 'disease_reversal_program'];

const HEALTH_FIELDS = [
  { key: 'weight', label: 'Weight (kg)', type: 'number' },
  { key: 'height', label: 'Height (cm)', type: 'number' },
  { key: 'daily_routine', label: 'Daily Routine', type: 'picker', options: DAILY_ROUTINE_OPTS },
  { key: 'medical_conditions', label: 'Medical Conditions', type: 'text' },
  { key: 'fitness_goal', label: 'Fitness Goal', type: 'picker', options: FITNESS_GOAL_OPTS },
  { key: 'smoking', label: 'Smoking', type: 'picker', options: SMOKING_OPTS },
  { key: 'alcohol_frequency', label: 'Alcohol', type: 'picker', options: ALCOHOL_OPTS },
  { key: 'dietary_preference', label: 'Diet', type: 'picker', options: DIET_OPTS },
  { key: 'special_focus', label: 'Special Focus', type: 'text' },
  { key: 'program_enrolled', label: 'Program', type: 'picker', options: PROGRAM_OPTS },
];

// Progress form field groups
const PROGRESS_GROUPS = [
  {
    title: 'Body Measurements',
    fields: [
      { key: 'weight', label: 'Weight (kg)' },
      { key: 'neck', label: 'Neck (cm)' },
      { key: 'chest', label: 'Chest (cm)' },
      { key: 'upper_waist', label: 'Upper Waist (cm)' },
      { key: 'lower_waist', label: 'Lower Waist (cm)' },
      { key: 'hips', label: 'Hips (cm)' },
      { key: 'arms', label: 'Arms (cm)' },
      { key: 'thighs', label: 'Thighs (cm)' },
    ],
  },
  {
    title: 'Strength',
    fields: [
      { key: 'pushups', label: 'Pushups' },
      { key: 'plank_seconds', label: 'Plank (sec)' },
      { key: 'squats', label: 'Squats' },
      { key: 'lunges', label: 'Lunges' },
      { key: 'deadlift', label: 'Deadlift (kg)' },
      { key: 'latpulldown', label: 'Lat Pulldown (kg)' },
      { key: 'chest_press', label: 'Chest Press (kg)' },
      { key: 'shoulder_press', label: 'Shoulder Press (kg)' },
    ],
  },
  {
    title: 'Endurance',
    fields: [
      { key: 'cycling_time', label: 'Cycling Time (min)' },
      { key: 'cycling_distance', label: 'Cycling Distance (km)' },
      { key: 'jumping_jacks', label: 'Jumping Jacks' },
      { key: 'burpees', label: 'Burpees' },
      { key: 'high_knees', label: 'High Knees' },
      { key: 'mountain_climbers', label: 'Mountain Climbers' },
      { key: 'skipping', label: 'Skipping' },
    ],
  },
  {
    title: 'Flexibility',
    fields: [
      { key: 'sit_and_reach', label: 'Sit & Reach (cm)' },
      { key: 'deep_squat_hold', label: 'Deep Squat Hold (sec)' },
      { key: 'hip_flexor_hold', label: 'Hip Flexor Hold (sec)' },
      { key: 'shoulder_mobility', label: 'Shoulder Mobility' },
      { key: 'bridge_hold', label: 'Bridge Hold (sec)' },
    ],
  },
  {
    title: 'Diet',
    fields: [
      { key: 'diet_compliance', label: 'Diet Compliance' },
      { key: 'meals_per_day', label: 'Meals/Day' },
      { key: 'protein_intake', label: 'Protein (g)' },
      { key: 'water_intake', label: 'Water (L)' },
      { key: 'junk_food_per_week', label: 'Junk Food/Week' },
    ],
  },
  {
    title: 'Lifestyle',
    fields: [
      { key: 'steps_per_day', label: 'Steps/Day' },
      { key: 'sleep_hours', label: 'Sleep (hrs)' },
    ],
  },
  {
    title: 'Feedback',
    fields: [
      { key: 'trainer_note', label: 'Trainer Note', multiline: true },
    ],
  },
];

export default function DashboardScreen() {
  const { role, token, customerId, trainerId } = useAuth();
  const insets = useSafeAreaInsets();

  // ── Customer state ──
  const [customerTab, setCustomerTab] = useState('details'); // 'details' | 'trainer'
  const [trainer, setTrainer] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [stepsAvailable, setStepsAvailable] = useState(false);
  const [stepsSyncing, setStepsSyncing] = useState(false);

  // ── Trainer state ──
  const [customers, setCustomers] = useState([]);
  const [todaySessions, setTodaySessions] = useState({});
  const [markingIds, setMarkingIds] = useState({});
  const [viewing, setViewing] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [pickerFor, setPickerFor] = useState(null);
  const [customerPhotoUri, setCustomerPhotoUri] = useState(null);
  // Action picker modal — shown on customer card tap
  const [actionCustomer, setActionCustomer] = useState(null);
  // Progress modal
  const [progressCustomer, setProgressCustomer] = useState(null);
  const [progressForm, setProgressForm] = useState({});
  const [progressSaving, setProgressSaving] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Customer loaders ──
  const loadCustomerDashboard = useCallback(async () => {
    if (role !== 'customer' || !customerId || !token) return;
    try {
      setLoading(true);
      const [dashRes, trainerRes] = await Promise.allSettled([
        fetchCustomerDashboard({ token, customerId }),
        fetchTrainerForCustomer({ customerId, token }),
      ]);
      if (dashRes.status === 'fulfilled') setDashData(dashRes.value);
      if (trainerRes.status === 'fulfilled') setTrainer(trainerRes.value.trainer);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [role, customerId, token]);

  // ── Trainer loaders ──
  const loadTrainerData = useCallback(async () => {
    if (role !== 'trainer' || !token) return;
    try {
      setLoading(true);
      const [custRes, sessRes] = await Promise.allSettled([
        fetchMyCustomers({ token }),
        trainerId ? fetchTodaySessions({ token, trainerId }) : Promise.resolve({ sessions: {} }),
      ]);
      if (custRes.status === 'fulfilled') setCustomers(custRes.value.customers || []);
      if (sessRes.status === 'fulfilled') setTodaySessions(sessRes.value.sessions || {});
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [role, token, trainerId]);

  useEffect(() => {
    loadCustomerDashboard();
    loadTrainerData();
  }, [loadCustomerDashboard, loadTrainerData]);

  // Step count init
  useEffect(() => {
    if (role === 'customer') {
      isStepCountAvailable().then(setStepsAvailable);
    }
  }, [role]);

  const onRefresh = () => {
    if (role === 'customer') loadCustomerDashboard();
    else if (role === 'trainer') loadTrainerData();
  };

  // ── Step sync ──
  const handleSyncSteps = async () => {
    try {
      setStepsSyncing(true);
      const granted = await requestStepPermission();
      if (!granted) {
        Alert.alert('Permission Denied', 'Step count permission was not granted.');
        return;
      }
      const steps = await getTodaySteps();
      if (steps === null) {
        Alert.alert('Error', 'Could not read steps.');
        return;
      }
      await syncSteps({ token, steps_per_day: steps, date: new Date().toISOString().slice(0, 10) });
      await loadCustomerDashboard();
      Alert.alert('Synced', `${steps} steps synced.`);
    } catch (err) {
      Alert.alert('Sync failed', err.message || 'Unable to sync');
    } finally {
      setStepsSyncing(false);
    }
  };

  // ── Session marking (trainer) ──
  const handleMarkSession = async (cId, status) => {
    // Prevent duplicate clicks or toggling to the same status.
    if (markingIds[cId]) return;
    if (todaySessions[cId] === status) return;

    const prevStatus = todaySessions[cId];
    // Optimistic UI update for today's status.
    setTodaySessions(prev => ({ ...prev, [cId]: status }));
    setMarkingIds(prev => ({ ...prev, [cId]: true }));

    try {
      const res = await markSession({ token, customer_id: cId, status });
      // Reconcile counts from server (authoritative).
      setCustomers(prev =>
        prev.map(c =>
          c.id === cId
            ? {
                ...c,
                completed_sessions: res.sessions_completed ?? c.completed_sessions,
                missed_sessions: res.sessions_missed ?? c.missed_sessions,
              }
            : c
        )
      );
      if (res.status) {
        setTodaySessions(prev => ({ ...prev, [cId]: res.status }));
      }
    } catch (err) {
      // Roll back optimistic update.
      setTodaySessions(prev => ({ ...prev, [cId]: prevStatus }));
      Alert.alert('Error', err.message || 'Failed to mark session');
    } finally {
      setMarkingIds(prev => {
        const next = { ...prev };
        delete next[cId];
        return next;
      });
    }
  };

  // ── Customer health modal (trainer) ──
  const openViewer = (c) => {
    setViewing(c);
    setIsEditing(false);
    setCustomerPhotoUri(null);
    setForm({
      weight: c.weight?.toString() || '',
      height: c.height?.toString() || '',
      daily_routine: c.daily_routine || '',
      medical_conditions: c.medical_conditions || '',
      fitness_goal: c.fitness_goal || '',
      smoking: c.smoking || '',
      alcohol_frequency: c.alcohol_frequency || '',
      dietary_preference: c.dietary_preference || '',
      special_focus: c.special_focus || '',
      program_enrolled: c.program_enrolled || '',
    });
  };

  const closeModal = () => {
    setViewing(null);
    setIsEditing(false);
    setCustomerPhotoUri(null);
  };

  const pickCustomerPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow gallery access to upload a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setCustomerPhotoUri(result.assets[0].uri);
    }
  };

  const saveHealth = async () => {
    try {
      setSaving(true);
      const data = await updateCustomerHealth({
        token,
        customerId: viewing.id,
        fields: { ...form },
        imageUri: customerPhotoUri,
      });
      setCustomers(prev => prev.map(c => (c.id === viewing.id ? data.customer : c)));
      closeModal();
      Alert.alert('Saved', 'Health details updated.');
    } catch (err) {
      Alert.alert('Update failed', err.message || 'Unable to update');
    } finally {
      setSaving(false);
    }
  };

  // ── Progress modal (trainer) ──
  const openProgressForm = async (c) => {
    try {
      const data = await fetchLatestProgress({ token, customerId: c.id });
      const existing = data.progress || {};
      const pf = {};
      PROGRESS_GROUPS.forEach(g => g.fields.forEach(f => {
        pf[f.key] = existing[f.key]?.toString() || '';
      }));
      setProgressForm(pf);
      setProgressCustomer(c);
    } catch {
      setProgressCustomer(c);
      setProgressForm({});
    }
  };

  const saveProgress = async () => {
    try {
      setProgressSaving(true);
      await addProgress({
        token,
        customer_id: progressCustomer.id,
        log_date: new Date().toISOString().slice(0, 10),
        fields: progressForm,
      });
      setProgressCustomer(null);
      Alert.alert('Saved', 'Progress updated.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save progress');
    } finally {
      setProgressSaving(false);
    }
  };

  // ── Render helpers ──
  const renderField = (f) => {
    if (!isEditing) {
      return (
        <View key={f.key} style={{ marginBottom: 12 }}>
          <Text style={styles.label}>{f.label}</Text>
          <View style={[styles.input, styles.inputReadOnly]}>
            <Text style={{ color: form[f.key] ? '#fff' : '#6b6360' }}>{form[f.key] || '—'}</Text>
          </View>
        </View>
      );
    }
    return (
      <View key={f.key} style={{ marginBottom: 12 }}>
        <Text style={styles.label}>{f.label}</Text>
        {f.type === 'picker' ? (
          <TouchableOpacity style={styles.input} onPress={() => setPickerFor(f.key)}>
            <Text style={{ color: form[f.key] ? '#fff' : '#6b6360' }}>{form[f.key] || 'Select...'}</Text>
          </TouchableOpacity>
        ) : (
          <TextInput
            style={styles.input}
            value={form[f.key]}
            onChangeText={(v) => setForm(p => ({ ...p, [f.key]: v }))}
            keyboardType={f.type === 'number' ? 'numeric' : 'default'}
            placeholder={f.label}
            placeholderTextColor="#6b6360"
          />
        )}
      </View>
    );
  };

  // ── Action picker handlers ──
  const handleViewDetails = () => {
    const c = actionCustomer;
    setActionCustomer(null);
    if (c) openViewer(c);
  };

  const handleUpdateProgress = () => {
    const c = actionCustomer;
    setActionCustomer(null);
    if (c) openProgressForm(c);
  };

  const handleMarkFromSheet = (status) => {
    const c = actionCustomer;
    setActionCustomer(null);
    if (c) handleMarkSession(c.id, status);
  };

  // Derived trainer stats
  const totalClients = customers.length;
  const activeClients = customers.filter(
    (c) => ((c.total_sessions ?? 0) - (c.completed_sessions ?? 0)) > 0
  ).length;
  const todaySessionsCount = customers.length;

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1716" />

      {/* Customer tab bar */}
      {role === 'customer' && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, customerTab === 'details' && styles.tabBtnActive]}
            onPress={() => setCustomerTab('details')}
          >
            <Text style={[styles.tabText, customerTab === 'details' && styles.tabTextActive]}>My Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, customerTab === 'trainer' && styles.tabBtnActive]}
            onPress={() => setCustomerTab('trainer')}
          >
            <Text style={[styles.tabText, customerTab === 'trainer' && styles.tabTextActive]}>Trainer Details</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#ffc803" />}
      >
        {/* ── CUSTOMER: My Details tab ── */}
        {role === 'customer' && customerTab === 'details' && (
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {dashData && (
              <>
                {/* ── 1. Header ── */}
                <View style={styles.header}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hello}>Hello, {dashData.customer_details?.name || 'there'}</Text>
                    <Text style={styles.helloSub}>Ready for your workout?</Text>
                  </View>
                  {dashData.customer_details?.upload_photo ? (
                    <Image
                      source={{ uri: avatarUri(dashData.customer_details.upload_photo) }}
                      style={styles.headerAvatar}
                    />
                  ) : (
                    <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                      <Text style={styles.headerAvatarInitial}>
                        {(dashData.customer_details?.name || '?')[0]}
                      </Text>
                    </View>
                  )}
                </View>

                {/* ── 2. Membership Banner ── */}
                {dashData.sessions_completed >= 12 && (
                  <View style={[styles.membershipBanner, styles.membershipBannerUrgent]}>
                    <View style={styles.membershipIconWrap}>
                      <Ionicons name="alert-circle" size={22} color="#1a1716" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.membershipTitle}>Plan Expired</Text>
                      <Text style={styles.membershipSub}>Renew now to keep going.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#1a1716" />
                  </View>
                )}
                {dashData.sessions_completed === 11 && (
                  <View style={styles.membershipBanner}>
                    <View style={styles.membershipIconWrap}>
                      <Ionicons name="flash" size={22} color="#1a1716" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.membershipTitle}>
                        {dashData.sessions_remaining ?? 1} session left
                      </Text>
                      <Text style={styles.membershipSub}>Renew your plan to continue.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#1a1716" />
                  </View>
                )}

                {/* ── 3. Today's Stats ── */}
                <Text style={styles.sectionHeading}>Today's Stats</Text>
                <Card style={styles.todayCard}>
                  <View style={styles.todayRow}>
                    <View style={styles.todayCol}>
                      <View style={styles.todayIconWrap}>
                        <Ionicons name="walk" size={20} color="#ffc803" />
                      </View>
                      <Text style={styles.todayValue}>{dashData.steps_today ?? '—'}</Text>
                      <Text style={styles.todayLabel}>Steps</Text>
                    </View>
                    <View style={styles.todayDivider} />
                    <View style={styles.todayCol}>
                      <View style={styles.todayIconWrap}>
                        <Ionicons name="moon" size={20} color="#ffc803" />
                      </View>
                      <Text style={styles.todayValue}>
                        {dashData.latest_progress?.sleep_hours ?? '—'}
                      </Text>
                      <Text style={styles.todayLabel}>Sleep (hrs)</Text>
                    </View>
                  </View>
                  {stepsAvailable && (
                    <TouchableOpacity
                      style={styles.syncBtn}
                      onPress={handleSyncSteps}
                      disabled={stepsSyncing}
                      activeOpacity={0.8}
                    >
                      {stepsSyncing ? (
                        <ActivityIndicator color="#1a1716" />
                      ) : (
                        <>
                          <Ionicons name="sync" size={14} color="#1a1716" />
                          <Text style={styles.syncBtnText}>Sync from Device</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </Card>

                {/* ── 4. Performance ── */}
                <Text style={styles.sectionHeading}>Performance</Text>
                <View style={styles.perfRow}>
                  <StatBox
                    value={dashData.sessions?.completed ?? 0}
                    label="Completed"
                    color="#22c55e"
                    icon="checkmark-circle"
                  />
                  <View style={{ width: 10 }} />
                  <StatBox
                    value={dashData.sessions?.missed ?? 0}
                    label="Missed"
                    color="#ef4444"
                    icon="close-circle"
                  />
                  <View style={{ width: 10 }} />
                  <StatBox
                    value={dashData.streak ?? 0}
                    label="Streak"
                    color="#ffc803"
                    icon="flame"
                  />
                </View>

                {/* ── 5. Weekly Progress ── */}
                <Text style={styles.sectionHeading}>Weekly Progress</Text>
                <Card>
                  <View style={styles.chartHeader}>
                    <Text style={styles.chartTitle}>Steps This Week</Text>
                    <View style={styles.chartBadge}>
                      <View style={styles.chartDot} />
                      <Text style={styles.chartBadgeText}>Steps</Text>
                    </View>
                  </View>
                  <View style={styles.chartPlaceholder}>
                    <Ionicons name="trending-up" size={32} color="#ffc803" />
                    <Text style={styles.chartPlaceholderText}>
                      Chart coming soon
                    </Text>
                  </View>
                </Card>

                {/* Trainer note */}
                {dashData.latest_note && (
                  <>
                    <Text style={styles.sectionHeading}>Trainer Note</Text>
                    <Card>
                      <Text style={styles.noteText}>{dashData.latest_note.trainer_note}</Text>
                    </Card>
                  </>
                )}
              </>
            )}

            {!dashData && !loading && <Text style={styles.info}>No data yet.</Text>}
          </>
        )}

        {/* ── CUSTOMER: Trainer Details tab ── */}
        {role === 'customer' && customerTab === 'trainer' && (
          <>
            <Text style={styles.title}>Trainer Details</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TrainerCard trainer={trainer} />
            {!trainer && !error && (
              <Text style={styles.info}>No trainer assigned yet. Please contact admin.</Text>
            )}
          </>
        )}

        {/* ── TRAINER view ── */}
        {role === 'trainer' && (
          <>
            <View style={styles.trHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.trHello}>Hello, Coach 👋</Text>
                <Text style={styles.trHelloSub}>Here's what's on today.</Text>
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Stats */}
            <View style={styles.trStatsRow}>
              <StatBox value={totalClients} label="Clients" icon="people" />
              <View style={{ width: 10 }} />
              <StatBox value={activeClients} label="Active" color="#22c55e" icon="flash" />
              <View style={{ width: 10 }} />
              <StatBox value={todaySessionsCount} label="Sessions Today" icon="time-outline" />
            </View>

            {/* Today's Sessions */}
            <SectionTitle>Today's Sessions</SectionTitle>
            <Card>
              {customers.length === 0 ? (
                <Text style={styles.emptyText}>No sessions today</Text>
              ) : (
                customers.map((c, idx) => (
                  <SessionItem
                    key={c.id}
                    customer={c}
                    status={todaySessions[c.id] || 'pending'}
                    onPress={() => setActionCustomer(c)}
                    divider={idx < customers.length - 1}
                  />
                ))
              )}
            </Card>

            {/* Pending Actions */}
            <SectionTitle>Pending Actions</SectionTitle>
            <Card>
              <Text style={styles.emptyText}>No pending actions</Text>
            </Card>
          </>
        )}
      </ScrollView>

      {/* ── Action picker modal (trainer) ── */}
      <Modal visible={!!actionCustomer} transparent animationType="fade" onRequestClose={() => setActionCustomer(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setActionCustomer(null)}>
          <View style={styles.actionSheet}>
            <Text style={styles.actionTitle}>{actionCustomer?.name}</Text>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleMarkFromSheet('completed')}
              activeOpacity={0.7}
              disabled={actionCustomer && todaySessions[actionCustomer.id] === 'completed'}
            >
              <View style={[styles.actionBtnIconWrap, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
              </View>
              <Text style={styles.actionBtnText}>Mark Completed</Text>
              <Ionicons name="chevron-forward" size={16} color="#6b6360" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleMarkFromSheet('missed')}
              activeOpacity={0.7}
              disabled={actionCustomer && todaySessions[actionCustomer.id] === 'missed'}
            >
              <View style={[styles.actionBtnIconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                <Ionicons name="close-circle" size={18} color="#ef4444" />
              </View>
              <Text style={styles.actionBtnText}>Mark Missed</Text>
              <Ionicons name="chevron-forward" size={16} color="#6b6360" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleViewDetails} activeOpacity={0.7}>
              <View style={styles.actionBtnIconWrap}>
                <Ionicons name="person-outline" size={18} color="#ffc803" />
              </View>
              <Text style={styles.actionBtnText}>View Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#6b6360" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleUpdateProgress} activeOpacity={0.7}>
              <View style={styles.actionBtnIconWrap}>
                <Ionicons name="trending-up-outline" size={18} color="#ffc803" />
              </View>
              <Text style={styles.actionBtnText}>Update Progress</Text>
              <Ionicons name="chevron-forward" size={16} color="#6b6360" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCancel} onPress={() => setActionCustomer(null)} activeOpacity={0.7}>
              <Text style={styles.actionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Health view/edit modal (trainer) ── */}
      <Modal visible={!!viewing} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{isEditing ? 'Edit' : 'View'} — {viewing?.name}</Text>
            <ScrollView style={{ maxHeight: 450 }}>
              {/* Photo block — upload only, no URL field */}
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.label}>Photo</Text>
                {(() => {
                  const existing = avatarUri(viewing?.upload_photo);
                  const display = customerPhotoUri || existing;
                  if (!isEditing) {
                    return display ? (
                      <Image source={{ uri: display }} style={styles.photoPreview} />
                    ) : (
                      <View style={[styles.input, styles.inputReadOnly]}>
                        <Text style={{ color: '#6b6360' }}>—</Text>
                      </View>
                    );
                  }
                  return (
                    <View style={styles.photoEditRow}>
                      {display ? (
                        <Image source={{ uri: display }} style={styles.photoPreview} />
                      ) : (
                        <View style={[styles.photoPreview, styles.photoPlaceholder]}>
                          <Ionicons name="image-outline" size={22} color="#6b6360" />
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.photoPickBtn}
                        onPress={pickCustomerPhoto}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                        <Text style={styles.photoPickBtnText}>
                          {customerPhotoUri ? 'Change Photo' : 'Upload Photo'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}
              </View>
              {HEALTH_FIELDS.map(renderField)}
            </ScrollView>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={closeModal} disabled={saving}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              {!isEditing ? (
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => setIsEditing(true)}>
                  <Text style={styles.btnPrimaryText}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={saveHealth} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Save</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Progress modal (trainer) ── */}
      <Modal visible={!!progressCustomer} animationType="slide" transparent onRequestClose={() => setProgressCustomer(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Update Progress — {progressCustomer?.name}</Text>
            <ScrollView style={{ maxHeight: 450 }}>
              {PROGRESS_GROUPS.map(group => (
                <View key={group.title}>
                  <Text style={styles.progressGroupTitle}>{group.title}</Text>
                  {group.fields.map(f => (
                    <View key={f.key} style={{ marginBottom: 10 }}>
                      <Text style={styles.label}>{f.label}</Text>
                      <TextInput
                        style={styles.input}
                        value={progressForm[f.key] || ''}
                        onChangeText={v => setProgressForm(p => ({ ...p, [f.key]: v }))}
                        keyboardType={f.multiline ? 'default' : 'numeric'}
                        multiline={f.multiline}
                        placeholder={f.label}
                        placeholderTextColor="#6b6360"
                      />
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setProgressCustomer(null)} disabled={progressSaving}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={saveProgress} disabled={progressSaving}>
                {progressSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Picker modal ── */}
      <Modal visible={!!pickerFor} transparent animationType="fade" onRequestClose={() => setPickerFor(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerFor(null)}>
          <View style={styles.pickerSheet}>
            <FlatList
              data={HEALTH_FIELDS.find(f => f.key === pickerFor)?.options || []}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerItem} onPress={() => { setForm(p => ({ ...p, [pickerFor]: item })); setPickerFor(null); }}>
                  <Text style={styles.pickerItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1a1716' },
  container: { flex: 1, backgroundColor: '#1a1716' },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#ffc803', marginBottom: 16, letterSpacing: 0.3 },

  // Tab bar (customer)
  tabBar: { flexDirection: 'row', backgroundColor: '#252120', borderBottomWidth: 1, borderBottomColor: '#332e2b' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#ffc803' },
  tabText: { color: '#6b6360', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#ffc803' },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#252120', borderRadius: 14, padding: 14,
    alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#332e2b',
  },
  statNum: { fontSize: 28, fontWeight: '800', color: '#ffc803' },
  statLabel: { fontSize: 11, color: '#a09890', marginTop: 4, textTransform: 'uppercase' },

  section: { backgroundColor: '#252120', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#332e2b' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 8 },
  bigNum: { fontSize: 36, fontWeight: '800', color: '#ffc803', textAlign: 'center', marginVertical: 4 },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffc803',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignSelf: 'center',
    marginTop: 14,
  },
  syncBtnText: { color: '#1a1716', fontWeight: '700', fontSize: 13 },
  noteText: { color: '#a09890', fontSize: 14, lineHeight: 20 },

  // Chart
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 120 },
  chartBar: { alignItems: 'center', flex: 1 },
  bar: { width: 22, backgroundColor: '#ffc803', borderRadius: 4, marginVertical: 4 },
  chartVal: { color: '#a09890', fontSize: 10 },
  chartLabel: { color: '#6b6360', fontSize: 10 },

  error: { color: '#ef4444', marginBottom: 8 },
  info: { fontSize: 14, color: '#a09890', marginTop: 8 },

  // Customer card (trainer view)
  card: {
    flexDirection: 'row', backgroundColor: '#252120', borderRadius: 16,
    padding: 14, marginBottom: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#332e2b',
  },
  cardTouchable: { flexDirection: 'row', flex: 1, alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: '#1f1b1a', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#ffc803', fontSize: 20, fontWeight: '700' },
  cardName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardStatsRow: { flexDirection: 'row', marginTop: 4, gap: 8 },
  cardStatChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardStatVal: { color: '#ffc803', fontSize: 13, fontWeight: '700' },
  cardStatLabel: { color: '#6b6360', fontSize: 11 },
  cardMeta: { color: '#a09890', fontSize: 11, marginTop: 3 },
  tag: {
    color: '#1a1716', backgroundColor: '#ffc803', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 5,
    fontSize: 10, fontWeight: '700', overflow: 'hidden',
  },

  // Card right actions
  cardActions: { alignItems: 'center', marginLeft: 8, gap: 6 },
  sesBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#1f1b1a',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#332e2b',
  },
  sesBtnActive: { backgroundColor: '#16a34a', borderColor: '#22c55e' },
  sesBtnMiss: {},
  sesBtnMissActive: { backgroundColor: '#dc2626', borderColor: '#ef4444' },

  // Modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalSheet: { backgroundColor: '#252120', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#332e2b' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#fff' },
  label: { fontSize: 13, color: '#a09890', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#332e2b', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    backgroundColor: '#1f1b1a', color: '#fff',
  },
  inputReadOnly: { backgroundColor: '#1a1716' },
  photoPreview: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#1a1716',
    borderWidth: 1,
    borderColor: '#332e2b',
  },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  photoEditRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoPickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1f1b1a',
    borderWidth: 1,
    borderColor: '#332e2b',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  photoPickBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 10 },
  btn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, minWidth: 90, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#ffc803' },
  btnPrimaryText: { color: '#1a1716', fontWeight: '700' },
  btnGhost: { backgroundColor: '#1f1b1a', borderWidth: 1, borderColor: '#332e2b' },
  btnGhostText: { color: '#a09890', fontWeight: '600' },

  progressGroupTitle: {
    fontSize: 14, fontWeight: '700', color: '#ffc803',
    marginTop: 12, marginBottom: 6, borderBottomWidth: 1,
    borderBottomColor: '#332e2b', paddingBottom: 4,
  },

  // Action picker modal
  actionSheet: {
    backgroundColor: '#252120', borderRadius: 20, padding: 20,
    marginHorizontal: 20, borderWidth: 1, borderColor: '#332e2b',
  },
  actionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16, textAlign: 'center' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1f1b1a', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 8, borderWidth: 1, borderColor: '#332e2b',
  },
  actionBtnIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,200,3,0.10)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  actionCancel: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  actionCancelText: { color: '#6b6360', fontSize: 14, fontWeight: '600' },

  pickerSheet: { backgroundColor: '#252120', borderRadius: 12, marginHorizontal: 30, maxHeight: 320, borderWidth: 1, borderColor: '#332e2b' },
  pickerItem: { paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#332e2b' },
  pickerItemText: { fontSize: 15, color: '#fff' },

  // Client details
  clientHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  clientAvatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
  clientName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  clientSub: { color: '#a09890', fontSize: 13, marginTop: 2 },

  detailGrid: { marginTop: 4 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#332e2b',
  },
  detailLabel: { color: '#a09890', fontSize: 13 },
  detailValue: { color: '#fff', fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },

  // Renewal banner (legacy — kept in case of other callers)
  banner: {
    backgroundColor: '#ffc803', borderRadius: 12, padding: 14,
    marginBottom: 14, alignItems: 'center',
  },
  bannerUrgent: { backgroundColor: '#EF4444' },
  bannerText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },

  // ── Redesigned customer dashboard ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  hello: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  helloSub: {
    color: '#b3b3b3',
    fontSize: 14,
    marginTop: 4,
  },
  headerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#ffc803',
  },
  headerAvatarPlaceholder: {
    backgroundColor: '#242120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitial: {
    color: '#ffc803',
    fontSize: 22,
    fontWeight: '700',
  },

  membershipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffc803',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 18,
    gap: 12,
    shadowColor: '#ffc803',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  membershipBannerUrgent: { backgroundColor: '#ef4444' },
  membershipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(26,23,22,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  membershipTitle: {
    color: '#1a1716',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  membershipSub: {
    color: '#1a1716',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
    marginTop: 2,
  },

  sectionHeading: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 6,
    letterSpacing: 0.2,
  },

  todayCard: { marginBottom: 18 },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  todayDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#2e2a28',
    marginHorizontal: 8,
  },
  todayIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,200,3,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  todayValue: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  todayLabel: {
    color: '#b3b3b3',
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  perfRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },

  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  chartTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  chartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,200,3,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  chartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffc803',
  },
  chartBadgeText: {
    color: '#ffc803',
    fontSize: 11,
    fontWeight: '700',
  },
  chartPlaceholder: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f1b1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2e2a28',
    borderStyle: 'dashed',
    gap: 8,
  },
  chartPlaceholderText: {
    color: '#b3b3b3',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Trainer dashboard ──
  trHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  trHello: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  trHelloSub: {
    color: '#b3b3b3',
    fontSize: 13,
    marginTop: 4,
  },
  trStatsRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  emptyText: {
    color: '#b3b3b3',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
