import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../navigation/AppNavigator';
import { fetchAllUsers, fetchUserDetails, adminUpdateUser } from '../services/api';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

function avatarUri(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path}`;
}

// ── Field definitions (same enums as CreateUserScreen) ──
const CUSTOMER_FIELDS = [
  { key: 'name', label: 'Name *', placeholder: 'Full name', required: true },
  { key: 'mobile', label: 'Mobile *', placeholder: '10-digit number', keyboard: 'phone-pad', required: true },
  { key: 'address', label: 'Address', placeholder: 'Street, City', lines: 2 },
  { key: 'total_sessions', label: 'Total Sessions', placeholder: '0', keyboard: 'numeric' },
  { key: 'weight', label: 'Weight (kg)', placeholder: '70', keyboard: 'decimal-pad' },
  { key: 'height', label: 'Height (cm)', placeholder: '175', keyboard: 'decimal-pad' },
  { key: 'amount_paid', label: 'Amount Paid', placeholder: '0.00', keyboard: 'decimal-pad' },
  { key: 'amount_paid_on', label: 'Amount Paid On', placeholder: 'YYYY-MM-DD' },
  { key: 'start_date', label: 'Start Date', placeholder: 'YYYY-MM-DD' },
  { key: 'age', label: 'Age', placeholder: '25', keyboard: 'numeric' },
  {
    key: 'daily_routine', label: 'Daily Routine', type: 'picker',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Sitting', value: 'sitting' },
      { label: 'Mixed', value: 'mixed' },
    ],
  },
  { key: 'medical_conditions', label: 'Medical Conditions', placeholder: 'e.g. diabetes, hypertension', lines: 2 },
  {
    key: 'fitness_goal', label: 'Fitness Goal', type: 'picker',
    options: [
      { label: 'Weight Loss', value: 'weight_loss' },
      { label: 'Muscle Gain', value: 'muscle_gain' },
      { label: 'Overall Fitness', value: 'overall_fitness' },
      { label: 'Strength Building', value: 'strength_building' },
    ],
  },
  {
    key: 'smoking', label: 'Smoking', type: 'picker',
    options: [
      { label: 'No', value: 'no' },
      { label: 'Yes', value: 'yes' },
    ],
  },
  {
    key: 'alcohol_frequency', label: 'Alcohol Frequency', type: 'picker',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Occasional', value: 'occasional' },
      { label: 'Weekly', value: 'weekly' },
      { label: 'Daily', value: 'daily' },
    ],
  },
  {
    key: 'dietary_preference', label: 'Dietary Preference', type: 'picker',
    options: [
      { label: 'Vegetarian', value: 'vegetarian' },
      { label: 'Non-Vegetarian', value: 'non_vegetarian' },
      { label: 'Vegan', value: 'vegan' },
      { label: 'Lacto-Ovo', value: 'lacto_ovo' },
      { label: 'Ovo', value: 'ovo' },
      { label: 'Pescatarian', value: 'pescatarian' },
    ],
  },
  { key: 'special_focus', label: 'Special Focus', placeholder: 'e.g. lower back pain, post-injury', lines: 2 },
  {
    key: 'program_enrolled', label: 'Program Enrolled', type: 'picker',
    options: [
      { label: 'My Home Coach', value: 'my_home_coach' },
      { label: 'My Home Coach Couple', value: 'my_home_coach_couple' },
      { label: 'Fit Mentor Program', value: 'fit_mentor_program' },
      { label: 'Disease Reversal Program', value: 'disease_reversal_program' },
    ],
  },
];

const TRAINER_FIELDS = [
  { key: 'name', label: 'Name *', placeholder: 'Full name', required: true },
  { key: 'mobileno', label: 'Mobile No *', placeholder: '10-digit number', keyboard: 'phone-pad', required: true },
  { key: 'bio', label: 'Bio', placeholder: 'Short biography', lines: 3 },
  { key: 'specialization', label: 'Specialization', placeholder: 'e.g. Weightlifting, Yoga' },
  { key: 'certifications', label: 'Certifications', placeholder: 'e.g. ACE, NASM (comma separated)' },
  { key: 'introduction_video_url', label: 'Intro Video URL (optional)', placeholder: 'https://...' },
];

// ────────────────────────────────────────────────────────
// User row component for the selection list
// ────────────────────────────────────────────────────────
function UserRow({ user, role, onPress }) {
  const photo = avatarUri(role === 'customer' ? user.upload_photo : user.profile);
  const sub = role === 'customer' ? user.mobile : user.mobileno;

  return (
    <TouchableOpacity style={s.userRow} onPress={onPress} activeOpacity={0.7}>
      {photo ? (
        <Image source={{ uri: photo }} style={s.userAvatar} />
      ) : (
        <View style={[s.userAvatar, s.avatarPlaceholder]}>
          <Ionicons name={role === 'customer' ? 'person' : 'barbell'} size={20} color="#94a3b8" />
        </View>
      )}
      <View style={s.userInfo}>
        <Text style={s.userName}>{user.name}</Text>
        {sub ? <Text style={s.userSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
}

// ────────────────────────────────────────────────────────
// Main screen — 3 steps: pick role → pick user → edit form
// ────────────────────────────────────────────────────────
export default function EditUserScreen({ navigation }) {
  const { token } = useAuth();

  // Steps: 'pick_role' → 'pick_user' → 'form'
  const [step, setStep] = useState('pick_role');
  const [selectedRole, setSelectedRole] = useState(null);

  // User list
  const [customers, setCustomers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Selected user + form
  const [selectedUser, setSelectedUser] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [imageUri, setImageUri] = useState(null);
  const [existingPhoto, setExistingPhoto] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Picker modal
  const [pickerModal, setPickerModal] = useState({ visible: false, field: null });

  // ── Load users ──────────────────────────────────────
  const loadUsers = useCallback(async () => {
    try {
      const data = await fetchAllUsers({ token });
      setCustomers(data.customers);
      setTrainers(data.trainers);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load users');
    }
  }, [token]);

  const goToPickUser = async (role) => {
    setSelectedRole(role);
    setListLoading(true);
    setStep('pick_user');
    await loadUsers();
    setListLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  // ── Load user details into form ─────────────────────
  const selectUser = async (user) => {
    setSelectedUser(user);
    setFormLoading(true);
    setStep('form');
    try {
      const data = await fetchUserDetails({ token, role: selectedRole, id: user.id });
      const profile = data.profile;

      // Pre-fill formValues from profile
      const vals = {};
      const fields = selectedRole === 'customer' ? CUSTOMER_FIELDS : TRAINER_FIELDS;
      for (const f of fields) {
        const raw = profile[f.key];
        if (raw !== null && raw !== undefined) {
          // Stringify numbers so TextInput can display them
          vals[f.key] = String(raw);
        }
      }
      setFormValues(vals);

      // Existing photo
      const photoKey = selectedRole === 'customer' ? 'upload_photo' : 'profile';
      setExistingPhoto(profile[photoKey] ? avatarUri(profile[photoKey]) : null);
      setImageUri(null);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load user details');
      setStep('pick_user');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Form helpers ────────────────────────────────────
  const handleChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const openPicker = (field) => setPickerModal({ visible: true, field });
  const closePicker = () => setPickerModal({ visible: false, field: null });
  const selectPickerOption = (value) => {
    handleChange(pickerModal.field.key, value);
    closePicker();
  };
  const getPickerLabel = (field) => {
    const val = formValues[field.key];
    if (!val) return `Select ${field.label}`;
    return field.options.find((o) => o.value === val)?.label ?? val;
  };

  const pickImage = async () => {
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
      setImageUri(result.assets[0].uri);
    }
  };

  // ── Validate ────────────────────────────────────────
  const validate = () => {
    const fields = selectedRole === 'customer' ? CUSTOMER_FIELDS : TRAINER_FIELDS;
    const missing = fields
      .filter((f) => f.required && !formValues[f.key]?.trim())
      .map((f) => f.label.replace(' *', ''));

    if (missing.length) {
      Alert.alert('Missing fields', `Please fill: ${missing.join(', ')}`);
      return false;
    }

    const mobileKey = selectedRole === 'customer' ? 'mobile' : 'mobileno';
    const mobileVal = formValues[mobileKey];
    if (mobileVal && !/^\d{10,15}$/.test(mobileVal.trim())) {
      Alert.alert('Invalid mobile', 'Mobile must be 10–15 digits (numbers only).');
      return false;
    }

    return true;
  };

  // ── Submit update ───────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const imageFieldName = selectedRole === 'customer' ? 'upload_photo' : 'profile';

      const result = await adminUpdateUser({
        token,
        role: selectedRole,
        id: selectedUser.id,
        formData: formValues,
        imageUri,
        imageFieldName,
      });

      Alert.alert(
        'Updated',
        result.message || 'User updated successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════
  //  STEP 1 — Pick role
  // ═══════════════════════════════════════════════════
  if (step === 'pick_role') {
    return (
      <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={s.container}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>

          <Text style={s.title}>Edit User</Text>
          <Text style={s.subtitle}>Select the type of user to edit</Text>

          <TouchableOpacity style={s.roleCard} onPress={() => goToPickUser('customer')}>
            <View style={[s.roleIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="person" size={30} color="#16a34a" />
            </View>
            <View style={s.roleInfo}>
              <Text style={s.roleCardTitle}>Customer</Text>
              <Text style={s.roleCardDesc}>Edit customer details</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={s.roleCard} onPress={() => goToPickUser('trainer')}>
            <View style={[s.roleIcon, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="barbell" size={30} color="#7c3aed" />
            </View>
            <View style={s.roleInfo}>
              <Text style={s.roleCardTitle}>Trainer</Text>
              <Text style={s.roleCardDesc}>Edit trainer details</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════
  //  STEP 2 — Pick user from list
  // ═══════════════════════════════════════════════════
  if (step === 'pick_user') {
    const list = selectedRole === 'customer' ? customers : trainers;

    return (
      <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

        <View style={s.header}>
          <TouchableOpacity onPress={() => setStep('pick_role')} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            Select {selectedRole === 'customer' ? 'Customer' : 'Trainer'}
          </Text>
          <View style={{ width: 38 }} />
        </View>

        {listLoading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={s.centered}>
                <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                <Text style={s.emptyText}>No {selectedRole}s found</Text>
              </View>
            }
            renderItem={({ item }) => (
              <UserRow user={item} role={selectedRole} onPress={() => selectUser(item)} />
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════
  //  STEP 3 — Edit form
  // ═══════════════════════════════════════════════════
  const fields = selectedRole === 'customer' ? CUSTOMER_FIELDS : TRAINER_FIELDS;
  const displayPhoto = imageUri || existingPhoto;

  if (formLoading) {
    return (
      <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ color: '#64748b', marginTop: 12 }}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => setStep('pick_user')} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            Edit {selectedUser?.name}
          </Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo */}
          <TouchableOpacity style={s.imagePicker} onPress={pickImage}>
            {displayPhoto ? (
              <Image source={{ uri: displayPhoto }} style={s.imagePreview} />
            ) : (
              <View style={s.imagePlaceholder}>
                <Ionicons name="camera-outline" size={32} color="#94a3b8" />
                <Text style={s.imagePickerText}>Change Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Dynamic fields */}
          {fields.map((field) => (
            <View key={field.key} style={s.fieldGroup}>
              <Text style={s.label}>{field.label}</Text>
              {field.type === 'picker' ? (
                <TouchableOpacity
                  style={s.pickerTrigger}
                  onPress={() => openPicker(field)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.pickerTriggerText, !formValues[field.key] && s.pickerPlaceholder]}>
                    {getPickerLabel(field)}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={[s.input, field.lines > 1 && { height: field.lines * 36, textAlignVertical: 'top' }]}
                  placeholder={field.placeholder}
                  placeholderTextColor="#94a3b8"
                  keyboardType={field.keyboard || 'default'}
                  multiline={field.lines > 1}
                  numberOfLines={field.lines || 1}
                  value={formValues[field.key] || ''}
                  onChangeText={(v) => handleChange(field.key, v)}
                />
              )}
            </View>
          ))}

          {/* Picker modal */}
          <Modal
            visible={pickerModal.visible}
            transparent
            animationType="fade"
            onRequestClose={closePicker}
          >
            <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={closePicker}>
              <View style={s.modalSheet}>
                <Text style={s.modalTitle}>{pickerModal.field?.label}</Text>
                <FlatList
                  data={pickerModal.field?.options ?? []}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => {
                    const selected = formValues[pickerModal.field?.key] === item.value;
                    return (
                      <TouchableOpacity
                        style={[s.modalOption, selected && s.modalOptionSelected]}
                        onPress={() => selectPickerOption(item.value)}
                      >
                        <Text style={[s.modalOptionText, selected && s.modalOptionTextSelected]}>
                          {item.label}
                        </Text>
                        {selected && <Ionicons name="checkmark" size={18} color="#2563eb" />}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Submit */}
          <TouchableOpacity
            style={[s.primaryBtn, isSubmitting && s.primaryBtnDisabled]}
            disabled={isSubmitting}
            onPress={handleSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.primaryBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },

  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a', marginTop: 24 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4, marginBottom: 28 },

  // ── Role cards ──
  roleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 18, borderRadius: 16, marginBottom: 14,
    borderWidth: 2, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  roleIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  roleInfo: { flex: 1, marginLeft: 14 },
  roleCardTitle: { fontSize: 17, fontWeight: '600', color: '#1e293b' },
  roleCardDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },

  // ── User list rows ──
  userRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 14, borderRadius: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  userAvatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  userSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  emptyText: { fontSize: 14, color: '#94a3b8', marginTop: 8 },

  // ── Image picker ──
  imagePicker: { alignSelf: 'center', marginBottom: 24 },
  imagePlaceholder: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#cbd5e1', borderStyle: 'dashed',
  },
  imagePreview: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#2563eb' },
  imagePickerText: { fontSize: 11, color: '#94a3b8', marginTop: 4 },

  // ── Fields ──
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, backgroundColor: '#fff', color: '#0f172a',
  },

  // ── Picker ──
  pickerTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff',
  },
  pickerTriggerText: { fontSize: 15, color: '#0f172a' },
  pickerPlaceholder: { color: '#94a3b8' },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 16, paddingBottom: 32, maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 16, fontWeight: '600', color: '#0f172a', textAlign: 'center',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 4,
  },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 20,
  },
  modalOptionSelected: { backgroundColor: '#eff6ff' },
  modalOptionText: { fontSize: 15, color: '#1e293b' },
  modalOptionTextSelected: { color: '#2563eb', fontWeight: '600' },

  // ── Primary button ──
  primaryBtn: {
    flexDirection: 'row', backgroundColor: '#2563eb', paddingVertical: 15,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
