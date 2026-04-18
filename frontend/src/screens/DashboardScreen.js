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
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../navigation/AppNavigator';
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
} from '../services/api';
import TrainerCard from '../components/TrainerCard';
import { isStepCountAvailable, requestStepPermission, getTodaySteps } from '../utils/stepCounter';

const SCREEN_W = Dimensions.get('window').width;

// ─── Option lists ────────────────────────────────────────
const DAILY_ROUTINE_OPTS = ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'];
const FITNESS_GOAL_OPTS = ['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness', 'disease_management'];
const SMOKING_OPTS = ['never', 'occasional', 'regular', 'former'];
const ALCOHOL_OPTS = ['never', 'rarely', 'occasionally', 'weekly', 'daily'];
const DIET_OPTS = ['vegetarian', 'vegan', 'non_vegetarian', 'eggetarian', 'jain'];
const PROGRAM_OPTS = ['my_home_coach', 'my_home_coach_couple', 'fit_mentor_program', 'disease_reversal_program'];

const HEALTH_FIELDS = [
  { key: 'upload_photo', label: 'Photo URL', type: 'text' },
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
    setForm({
      upload_photo: c.upload_photo || '',
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

  const closeModal = () => { setViewing(null); setIsEditing(false); };

  const saveHealth = async () => {
    try {
      setSaving(true);
      const data = await updateCustomerHealth({ token, customerId: viewing.id, fields: { ...form } });
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
            <Text style={{ color: form[f.key] ? '#111' : '#999' }}>{form[f.key] || '—'}</Text>
          </View>
        </View>
      );
    }
    return (
      <View key={f.key} style={{ marginBottom: 12 }}>
        <Text style={styles.label}>{f.label}</Text>
        {f.type === 'picker' ? (
          <TouchableOpacity style={styles.input} onPress={() => setPickerFor(f.key)}>
            <Text style={{ color: form[f.key] ? '#111' : '#999' }}>{form[f.key] || 'Select...'}</Text>
          </TouchableOpacity>
        ) : (
          <TextInput
            style={styles.input}
            value={form[f.key]}
            onChangeText={(v) => setForm(p => ({ ...p, [f.key]: v }))}
            keyboardType={f.type === 'number' ? 'numeric' : 'default'}
            placeholder={f.label}
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

  const renderCustomerCard = (c) => {
    const sessionStatus = todaySessions[c.id];
    const isMarking = !!markingIds[c.id];
    const programTag = c.trial_sessions > 0 ? 'Trial' : c.free_sessions > 0 ? 'Free' : c.program_enrolled || '—';

    return (
      <View key={c.id} style={styles.card}>
        <TouchableOpacity style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }} onPress={() => setActionCustomer(c)}>
          {c.upload_photo ? (
            <Image source={{ uri: c.upload_photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{(c.name || '?')[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{c.name}</Text>
            <Text style={styles.cardMeta}>
              Total: {c.total_sessions ?? 0} · Done: {c.completed_sessions ?? 0} · Missed: {c.missed_sessions ?? 0}
            </Text>
            {c.address ? <Text style={styles.cardMeta} numberOfLines={1}>{c.address}</Text> : null}
            <Text style={styles.tag}>{programTag}</Text>
          </View>
        </TouchableOpacity>

        {/* Right side: session marking */}
        <View style={styles.cardActions}>
          <View style={styles.sessionBtns}>
            <TouchableOpacity
              style={[styles.sesBtn, sessionStatus === 'completed' && styles.sesBtnActive, isMarking && { opacity: 0.5 }]}
              onPress={() => handleMarkSession(c.id, 'completed')}
              disabled={isMarking}
            >
              <Text style={styles.sesBtnText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sesBtn, styles.sesBtnMiss, sessionStatus === 'missed' && styles.sesBtnMissActive, isMarking && { opacity: 0.5 }]}
              onPress={() => handleMarkSession(c.id, 'missed')}
              disabled={isMarking}
            >
              <Text style={styles.sesBtnText}>✗</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ── Detail row helper (for client/payment cards) ──
  const DetailRow = ({ label, value, prefix = '', suffix = '' }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>
        {value != null && value !== '' ? `${prefix}${value}${suffix}` : '—'}
      </Text>
    </View>
  );

  // ── Simple bar chart ──
  const StepsChart = ({ data }) => {
    if (!data || data.length === 0) return <Text style={styles.info}>No step data yet.</Text>;
    const maxSteps = Math.max(...data.map(d => d.steps_per_day || 0), 1);
    return (
      <View style={styles.chartContainer}>
        {data.map((d, i) => {
          const steps = d.steps_per_day || 0;
          const h = Math.max((steps / maxSteps) * 80, 4);
          const dayLabel = new Date(d.log_date).toLocaleDateString('en', { weekday: 'short' });
          return (
            <View key={i} style={styles.chartBar}>
              <Text style={styles.chartVal}>{steps}</Text>
              <View style={[styles.bar, { height: h }]} />
              <Text style={styles.chartLabel}>{dayLabel}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#FFC107" />}
      >
        {/* ── CUSTOMER: My Details tab ── */}
        {role === 'customer' && customerTab === 'details' && (
          <>
            <Text style={styles.title}>My Details</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {dashData && (
              <>
                {/* ── Renewal Banner ── */}
                {dashData.sessions_completed >= 12 && (
                  <View style={[styles.banner, styles.bannerUrgent]}>
                    <Text style={styles.bannerText}>
                      Great job reaching here! Renew now to keep going.
                    </Text>
                  </View>
                )}
                {dashData.sessions_completed === 11 && (
                  <View style={styles.banner}>
                    <Text style={styles.bannerText}>
                      Your membership is expiring soon. Renew now to continue your sessions.
                    </Text>
                  </View>
                )}

                {/* ── Client Details Card ── */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Details</Text>

                  {/* Profile photo + name */}
                  <View style={styles.clientHeader}>
                    {dashData.customer_details?.upload_photo ? (
                      <Image source={{ uri: dashData.customer_details.upload_photo }} style={styles.clientAvatar} />
                    ) : (
                      <View style={[styles.clientAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarInitial}>{(dashData.customer_details?.name || '?')[0]}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientName}>{dashData.customer_details?.name || '—'}</Text>
                      <Text style={styles.clientSub}>{dashData.customer_details?.mobile || '—'}</Text>
                      {dashData.customer_details?.address ? (
                        <Text style={styles.clientSub} numberOfLines={2}>{dashData.customer_details.address}</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Health info grid */}
                  <View style={styles.detailGrid}>
                    <DetailRow label="Weight" value={dashData.latest_progress?.weight || dashData.customer_details?.weight} suffix=" kg" />
                    <DetailRow label="Height" value={dashData.latest_progress?.height || dashData.customer_details?.height} suffix=" cm" />
                    <DetailRow label="Age" value={dashData.customer_details?.age} />
                    <DetailRow label="Fitness Goal" value={dashData.customer_details?.fitness_goal} />
                    <DetailRow label="Daily Routine" value={dashData.customer_details?.daily_routine} />
                    <DetailRow label="Medical Conditions" value={dashData.customer_details?.medical_conditions} />
                    <DetailRow label="Smoking" value={dashData.customer_details?.smoking} />
                    <DetailRow label="Alcohol" value={dashData.customer_details?.alcohol_frequency} />
                    <DetailRow label="Diet" value={dashData.customer_details?.dietary_preference} />
                    <DetailRow label="Special Focus" value={dashData.customer_details?.special_focus} />
                    <DetailRow label="Program" value={dashData.customer_details?.program_enrolled} />
                  </View>
                </View>

                {/* ── Payment Details Card ── */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Payment Details</Text>
                  <View style={styles.detailGrid}>
                    <DetailRow label="Amount Paid" value={dashData.amount_paid} prefix="Rs " />
                    <DetailRow label="Total Sessions" value={dashData.total_sessions} />
                    <DetailRow label="Sessions Completed" value={dashData.sessions_completed} />
                    <DetailRow label="Sessions Remaining" value={dashData.sessions_remaining} />
                    <DetailRow label="Start Date" value={dashData.start_date ? new Date(dashData.start_date).toLocaleDateString('en-IN') : null} />
                  </View>
                </View>

                {/* ── Session Stats (compact) ── */}
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNum}>{dashData.streak}</Text>
                    <Text style={styles.statLabel}>Day Streak</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statNum, { color: '#22c55e' }]}>{dashData.sessions.completed}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statNum, { color: '#ef4444' }]}>{dashData.sessions.missed}</Text>
                    <Text style={styles.statLabel}>Missed</Text>
                  </View>
                </View>

                {/* Steps */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Steps Today</Text>
                  <Text style={styles.bigNum}>{dashData.steps_today ?? '—'}</Text>
                  {stepsAvailable && (
                    <TouchableOpacity style={styles.syncBtn} onPress={handleSyncSteps} disabled={stepsSyncing}>
                      {stepsSyncing ? <ActivityIndicator color="#121212" /> :
                        <Text style={styles.syncBtnText}>Sync from Device</Text>}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Trainer note */}
                {dashData.latest_note && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Trainer Note</Text>
                    <Text style={styles.noteText}>{dashData.latest_note.trainer_note}</Text>
                  </View>
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
            <Text style={styles.title}>My Customers</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {customers.length === 0 && !loading && (
              <Text style={styles.info}>No customers assigned yet.</Text>
            )}
            {customers.map(renderCustomerCard)}
          </>
        )}
      </ScrollView>

      {/* ── Action picker modal (trainer) ── */}
      <Modal visible={!!actionCustomer} transparent animationType="fade" onRequestClose={() => setActionCustomer(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setActionCustomer(null)}>
          <View style={styles.actionSheet}>
            <Text style={styles.actionTitle}>{actionCustomer?.name}</Text>
            <TouchableOpacity style={styles.actionBtn} onPress={handleViewDetails}>
              <Text style={styles.actionBtnIcon}>i</Text>
              <Text style={styles.actionBtnText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnProgress]} onPress={handleUpdateProgress}>
              <Text style={styles.actionBtnIcon}>+</Text>
              <Text style={styles.actionBtnText}>Update Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCancel} onPress={() => setActionCustomer(null)}>
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
  safeArea: { flex: 1, backgroundColor: '#121212' },
  container: { flex: 1, backgroundColor: '#121212' },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  title: {
    fontSize: 28, fontWeight: '800', color: '#FFC107',
    marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1,
  },

  // Tab bar (customer)
  tabBar: {
    flexDirection: 'row', backgroundColor: '#1E1E1E',
    borderBottomWidth: 1, borderBottomColor: '#333',
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#FFC107' },
  tabText: { color: '#888', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#FFC107' },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#1E1E1E', borderRadius: 12,
    padding: 14, alignItems: 'center', marginHorizontal: 4,
  },
  statNum: { fontSize: 28, fontWeight: '800', color: '#FFC107' },
  statLabel: { fontSize: 11, color: '#A0A0A0', marginTop: 4, textTransform: 'uppercase' },

  section: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  bigNum: { fontSize: 36, fontWeight: '800', color: '#FFC107', textAlign: 'center', marginVertical: 4 },
  syncBtn: {
    backgroundColor: '#FFC107', borderRadius: 20, paddingVertical: 8,
    paddingHorizontal: 16, alignSelf: 'center', marginTop: 8,
  },
  syncBtnText: { color: '#121212', fontWeight: '700', fontSize: 13 },
  noteText: { color: '#D1D5DB', fontSize: 14, lineHeight: 20 },

  // Chart
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 120 },
  chartBar: { alignItems: 'center', flex: 1 },
  bar: { width: 22, backgroundColor: '#FFC107', borderRadius: 4, marginVertical: 4 },
  chartVal: { color: '#A0A0A0', fontSize: 10 },
  chartLabel: { color: '#888', fontSize: 10 },

  error: { color: '#EF4444', marginBottom: 8 },
  info: { fontSize: 14, color: '#A0A0A0', marginTop: 8 },

  // Customer card (trainer view)
  card: {
    flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 12,
    padding: 12, marginBottom: 10, alignItems: 'center',
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 10 },
  avatarPlaceholder: { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#FFC107', fontSize: 20, fontWeight: '700' },
  cardName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cardMeta: { color: '#A0A0A0', fontSize: 11, marginTop: 1 },
  tag: {
    color: '#121212', backgroundColor: '#FFC107', alignSelf: 'flex-start',
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginTop: 3,
    fontSize: 10, fontWeight: '700',
  },

  // Card right actions
  cardActions: { alignItems: 'center', marginLeft: 6 },
  sessionBtns: { flexDirection: 'row', marginBottom: 6 },
  sesBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#22c55e',
    justifyContent: 'center', alignItems: 'center', marginHorizontal: 2,
  },
  sesBtnActive: { backgroundColor: '#16a34a', borderWidth: 2, borderColor: '#fff' },
  sesBtnMiss: { backgroundColor: '#ef4444' },
  sesBtnMissActive: { backgroundColor: '#dc2626', borderWidth: 2, borderColor: '#fff' },
  sesBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalSheet: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#111' },
  label: { fontSize: 13, color: '#374151', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#fff',
  },
  inputReadOnly: { backgroundColor: '#f9fafb' },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 10 },
  btn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, minWidth: 90, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnGhost: { backgroundColor: '#f3f4f6' },
  btnGhostText: { color: '#374151', fontWeight: '600' },

  progressGroupTitle: {
    fontSize: 14, fontWeight: '700', color: '#2563eb',
    marginTop: 12, marginBottom: 6, borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb', paddingBottom: 4,
  },

  // Action picker modal
  actionSheet: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    alignItems: 'center', marginHorizontal: 20,
  },
  actionTitle: {
    fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 20,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb',
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20,
    width: '100%', marginBottom: 10,
  },
  actionBtnProgress: { backgroundColor: '#16a34a' },
  actionBtnIcon: {
    color: '#fff', fontSize: 18, fontWeight: '800',
    width: 28, textAlign: 'center', marginRight: 10,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  actionCancel: { marginTop: 6, paddingVertical: 10 },
  actionCancelText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },

  pickerSheet: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 30, maxHeight: 320 },
  pickerItem: { paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerItemText: { fontSize: 15, color: '#111' },

  // Client details
  clientHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  clientAvatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
  clientName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  clientSub: { color: '#A0A0A0', fontSize: 13, marginTop: 2 },

  detailGrid: { marginTop: 4 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  detailLabel: { color: '#A0A0A0', fontSize: 13 },
  detailValue: { color: '#fff', fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },

  // Renewal banner
  banner: {
    backgroundColor: '#F59E0B', borderRadius: 12, padding: 14,
    marginBottom: 14, alignItems: 'center',
  },
  bannerUrgent: { backgroundColor: '#EF4444' },
  bannerText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
