import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../navigation/AppNavigator';
import {
  fetchCustomersForMapping,
  fetchTrainersList,
  mapTrainerToCustomer,
} from '../services/api';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

function avatarUri(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path}`;
}

// ────────────────────────────────────────────────────────
// Customer row
// ────────────────────────────────────────────────────────
function CustomerCard({ customer, onMapPress }) {
  const isMapped = !!customer.trainer_id;
  const photoUri = avatarUri(customer.upload_photo);

  return (
    <View style={styles.card}>
      {/* Customer photo + info */}
      <View style={styles.cardRow}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={24} color="#6b6360" />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{customer.name}</Text>
          {customer.mobile ? (
            <Text style={styles.cardSub}>{customer.mobile}</Text>
          ) : null}
        </View>
      </View>

      {/* Mapping status */}
      <View style={styles.mappingRow}>
        {isMapped ? (
          <View style={styles.mappedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
            <Text style={styles.mappedText}>
              Mapped to {customer.trainer_name}
            </Text>
          </View>
        ) : (
          <View style={styles.unmappedBadge}>
            <Ionicons name="alert-circle" size={14} color="#d97706" />
            <Text style={styles.unmappedText}>Not mapped</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.mapBtn, isMapped && styles.changeBtn]}
          onPress={() => onMapPress(customer)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isMapped ? 'swap-horizontal' : 'link'}
            size={16}
            color="#fff"
          />
          <Text style={styles.mapBtnText}>
            {isMapped ? 'Change' : 'Map'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────
// Trainer row (inside the picker modal)
// ────────────────────────────────────────────────────────
function TrainerRow({ trainer, selected, onPress }) {
  const photoUri = avatarUri(trainer.profile);

  return (
    <TouchableOpacity
      style={[styles.trainerRow, selected && styles.trainerRowSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.trainerAvatar} />
      ) : (
        <View style={[styles.trainerAvatar, styles.avatarPlaceholder]}>
          <Ionicons name="barbell" size={20} color="#6b6360" />
        </View>
      )}
      <View style={styles.trainerInfo}>
        <Text style={styles.trainerName}>{trainer.name}</Text>
        {trainer.specialization ? (
          <Text style={styles.trainerSpec}>{trainer.specialization}</Text>
        ) : null}
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color="#ffc803" />}
    </TouchableOpacity>
  );
}

// ────────────────────────────────────────────────────────
// Main screen
// ────────────────────────────────────────────────────────
export default function TrainerCustomerMappingScreen({ navigation }) {
  const { token } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch data ──────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [custRes, trainerRes] = await Promise.all([
        fetchCustomersForMapping({ token }),
        fetchTrainersList({ token }),
      ]);
      setCustomers(custRes.customers);
      setTrainers(trainerRes.trainers);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load data');
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Open trainer picker for a customer ──────────────
  const openTrainerPicker = (customer) => {
    setSelectedCustomer(customer);
    setSelectedTrainerId(customer.trainer_id || null);
    setModalVisible(true);
  };

  // ── Confirm mapping ─────────────────────────────────
  const confirmMapping = async () => {
    if (!selectedTrainerId) {
      Alert.alert('Select a trainer', 'Please choose a trainer before confirming.');
      return;
    }

    setSubmitting(true);
    try {
      await mapTrainerToCustomer({
        token,
        trainerId: selectedTrainerId,
        customerId: selectedCustomer.id,
      });
      Alert.alert('Success', `Trainer mapped to ${selectedCustomer.name}`);
      setModalVisible(false);
      await loadData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to map trainer');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Tab state ────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('mapped');

  // ── Filter helpers ──────────────────────────────────
  const unmapped = customers.filter((c) => !c.trainer_id);
  const mapped = customers.filter((c) => !!c.trainer_id);
  const displayedCustomers = activeTab === 'mapped' ? mapped : unmapped;

  // ── Loading state ───────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ffc803" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1716" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trainer–Customer Mapping</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mapped' && styles.tabActive]}
          onPress={() => setActiveTab('mapped')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'mapped' && styles.tabTextActive]}>
            Mapped ({mapped.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'unmapped' && styles.tabActive]}
          onPress={() => setActiveTab('unmapped')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'unmapped' && styles.tabTextActive]}>
            Unmapped ({unmapped.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayedCustomers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={48} color="#6b6360" />
            <Text style={styles.emptyText}>
              {activeTab === 'mapped' ? 'No mapped customers' : 'No unmapped customers'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <CustomerCard customer={item} onMapPress={openTrainerPicker} />
        )}
      />

      {/* ── Trainer picker modal ────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Trainer</Text>
              <TouchableOpacity onPress={confirmMapping} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffc803" />
                ) : (
                  <Text style={[styles.modalConfirm, !selectedTrainerId && { opacity: 0.4 }]}>
                    Confirm
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <Text style={styles.modalSubtitle}>
                Mapping for: {selectedCustomer.name}
              </Text>
            )}

            {/* Trainer list */}
            <FlatList
              data={trainers}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingBottom: 24 }}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Text style={styles.emptyText}>No trainers available</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TrainerRow
                  trainer={item}
                  selected={selectedTrainerId === item.id}
                  onPress={() => setSelectedTrainerId(item.id)}
                />
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1a1716' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#332e2b',
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#252120', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },

  tabContainer: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#252120', borderRadius: 12, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#1a1716', borderWidth: 1, borderColor: '#332e2b' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6b6360' },
  tabTextActive: { color: '#ffc803' },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  card: {
    backgroundColor: '#252120', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#332e2b',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { backgroundColor: '#1f1b1a', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cardSub: { fontSize: 13, color: '#a09890', marginTop: 2 },

  mappingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#332e2b',
  },
  mappedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mappedText: { fontSize: 13, color: '#22c55e', fontWeight: '500' },
  unmappedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unmappedText: { fontSize: 13, color: '#f59e0b', fontWeight: '500' },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ffc803', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  changeBtn: { backgroundColor: '#a68500' },
  mapBtnText: { color: '#1a1716', fontSize: 13, fontWeight: '700' },

  emptyText: { fontSize: 14, color: '#6b6360', marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#252120', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '75%', paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#332e2b',
  },
  modalCancel: { fontSize: 15, color: '#a09890' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  modalConfirm: { fontSize: 15, fontWeight: '600', color: '#ffc803' },
  modalSubtitle: { fontSize: 13, color: '#a09890', textAlign: 'center', paddingVertical: 10, backgroundColor: '#1f1b1a' },

  trainerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#332e2b',
  },
  trainerRowSelected: { backgroundColor: 'rgba(255,200,3,0.08)' },
  trainerAvatar: { width: 44, height: 44, borderRadius: 22 },
  trainerInfo: { flex: 1, marginLeft: 12 },
  trainerName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  trainerSpec: { fontSize: 12, color: '#a09890', marginTop: 2 },
});
