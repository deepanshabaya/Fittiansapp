import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../navigation/AppNavigator';
import Card from '../components/Card';
import InfoRow from '../components/InfoRow';
import {
  fetchMyTrainerProfile,
  updateMyTrainerProfile,
  fetchMyCustomerProfile,
  updateMyCustomerProfile,
  avatarUri,
} from '../services/api';

// Format a snake_case enum value like "weight_loss" → "Weight Loss".
function prettyEnum(v) {
  if (v == null || v === '') return null;
  return String(v)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Non-photo trainer fields. `profile` (photo) now goes through the image picker
// instead of a URL input.
const TRAINER_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'mobileno', label: 'Mobile No', keyboard: 'phone-pad', maxLength: 15 },
  { key: 'bio', label: 'Bio', multiline: true },
  { key: 'specialization', label: 'Specialization' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'introduction_video_url', label: 'Intro Video URL' },
];

async function pickImageFromLibrary() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Please allow gallery access to upload a photo.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (!result.canceled && result.assets?.[0]?.uri) {
    return result.assets[0].uri;
  }
  return null;
}

export default function ProfileScreen() {
  const { user, role, token, logout } = useAuth();
  const insets = useSafeAreaInsets();

  // Trainer state
  const [trainerInfo, setTrainerInfo] = useState(null);
  const [trainerLoading, setTrainerLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [trainerImageUri, setTrainerImageUri] = useState(null);
  const [saving, setSaving] = useState(false);

  // Customer state
  const [customerInfo, setCustomerInfo] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ mobile: '', address: '' });
  const [customerImageUri, setCustomerImageUri] = useState(null);
  const [customerSaving, setCustomerSaving] = useState(false);

  useEffect(() => {
    if (role === 'trainer' && token) {
      setTrainerLoading(true);
      fetchMyTrainerProfile({ token })
        .then((data) => {
          const t = data.trainer || data;
          setTrainerInfo(t);
          populateTrainerForm(t);
        })
        .catch((err) => console.error('Error fetching trainer profile', err))
        .finally(() => setTrainerLoading(false));
    }
  }, [role, token]);

  useEffect(() => {
    if (role === 'customer' && token) {
      loadCustomer();
    }
  }, [role, token]);

  const loadCustomer = async () => {
    try {
      setCustomerLoading(true);
      const data = await fetchMyCustomerProfile({ token });
      const c = data.customer || data;
      setCustomerInfo(c);
    } catch (err) {
      console.error('Error fetching customer profile', err);
    } finally {
      setCustomerLoading(false);
    }
  };

  const populateTrainerForm = (t) => {
    const f = {};
    TRAINER_FIELDS.forEach(({ key }) => {
      f[key] = t[key]?.toString() || '';
    });
    setForm(f);
  };

  const handleEdit = () => {
    if (trainerInfo) populateTrainerForm(trainerInfo);
    setTrainerImageUri(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (trainerInfo) populateTrainerForm(trainerInfo);
    setTrainerImageUri(null);
    setIsEditing(false);
  };

  const handlePickTrainerPhoto = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) setTrainerImageUri(uri);
  };

  const handleSave = async () => {
    const mobileVal = (form.mobileno || '').trim();
    if (mobileVal && !/^\d{10,15}$/.test(mobileVal)) {
      Alert.alert('Invalid mobile', 'Mobile number must be 10–15 digits.');
      return;
    }
    try {
      setSaving(true);
      const data = await updateMyTrainerProfile({
        token,
        fields: form,
        imageUri: trainerImageUri,
      });
      const t = data.trainer || data;
      setTrainerInfo(t);
      populateTrainerForm(t);
      setTrainerImageUri(null);
      setIsEditing(false);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err) {
      Alert.alert('Update failed', err.message || 'Unable to update');
    } finally {
      setSaving(false);
    }
  };

  const openCustomerEdit = () => {
    setCustomerForm({
      mobile: customerInfo?.mobile?.toString() || '',
      address: customerInfo?.address?.toString() || '',
    });
    setCustomerImageUri(null);
    setCustomerModalOpen(true);
  };

  const closeCustomerEdit = () => {
    if (customerSaving) return;
    setCustomerModalOpen(false);
  };

  const handlePickCustomerPhoto = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) setCustomerImageUri(uri);
  };

  const handleCustomerSave = async () => {
    const mobile = customerForm.mobile.trim();
    const address = customerForm.address.trim();

    if (mobile && !/^\d{10}$/.test(mobile)) {
      Alert.alert('Invalid mobile', 'Mobile number must be exactly 10 digits.');
      return;
    }

    try {
      setCustomerSaving(true);
      const data = await updateMyCustomerProfile({
        token,
        mobile: mobile || '',
        address: address || '',
        imageUri: customerImageUri,
      });
      const c = data.customer || data;
      setCustomerInfo(c);
      setCustomerImageUri(null);
      setCustomerModalOpen(false);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err) {
      Alert.alert('Update failed', err.message || 'Unable to update');
    } finally {
      setCustomerSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Log out?', 'You will need to sign in again to access your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const showTrainerEdit = role === 'trainer' && !!trainerInfo && isEditing;
  const showTrainerUpdateBtn = role === 'trainer' && !!trainerInfo && !isEditing;
  const showCustomerUpdateBtn = role === 'customer' && !!customerInfo;

  const trainerExistingPhoto = avatarUri(trainerInfo?.profile);
  const trainerDisplayPhoto = trainerImageUri || trainerExistingPhoto;
  const customerExistingPhoto = avatarUri(customerInfo?.upload_photo);
  const customerDisplayPhoto = customerImageUri || customerExistingPhoto;

  const displayName =
    trainerInfo?.name || customerInfo?.name || user?.email || 'Account';
  const initial = (displayName || '?').charAt(0).toUpperCase();
  const headerPhoto = role === 'trainer' ? trainerExistingPhoto : customerExistingPhoto;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1716" />
      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profile</Text>

        {/* ── Identity header (trainer + fallback) ── */}
        {role !== 'customer' && (
          <View style={styles.identityCard}>
            <View style={styles.avatar}>
              {headerPhoto ? (
                <Image source={{ uri: headerPhoto }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>
            <View style={styles.identityText}>
              <Text style={styles.identityName} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.roleChip}>
                <Ionicons
                  name={role === 'trainer' ? 'fitness-outline' : 'person-outline'}
                  size={12}
                  color="#ffc803"
                />
                <Text style={styles.roleChipText}>{role ? role.toUpperCase() : 'USER'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Account details (trainer + fallback) */}
        {role !== 'customer' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user?.email || 'N/A'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Role</Text>
              <Text style={styles.value}>{role ? role.toUpperCase() : 'N/A'}</Text>
            </View>
          </View>
        )}

        {/* ── Customer: premium layout ── */}
        {role === 'customer' && (
          customerLoading ? (
            <ActivityIndicator size="large" color="#ffc803" style={{ marginVertical: 40 }} />
          ) : customerInfo ? (
            <>
              {/* 1. Profile Header */}
              <Card style={styles.profileHeaderCard}>
                <View style={styles.profileAvatar}>
                  {customerExistingPhoto ? (
                    <Image source={{ uri: customerExistingPhoto }} style={styles.profileAvatarImg} />
                  ) : (
                    <Text style={styles.profileAvatarText}>
                      {(customerInfo.name || '?').charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {customerInfo.name || displayName}
                  </Text>
                  {customerInfo.mobile ? (
                    <View style={styles.profileMetaRow}>
                      <Ionicons name="call-outline" size={13} color="#b3b3b3" />
                      <Text style={styles.profileMeta}>{customerInfo.mobile}</Text>
                    </View>
                  ) : null}
                  {customerInfo.address ? (
                    <View style={styles.profileMetaRow}>
                      <Ionicons name="location-outline" size={13} color="#b3b3b3" />
                      <Text style={styles.profileMeta} numberOfLines={2}>
                        {customerInfo.address}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Card>

              {/* 2. Personal Info */}
              <Text style={styles.sectionHeading}>Personal Info</Text>
              <Card>
                <InfoRow label="Age" value={customerInfo.age} />
                <InfoRow label="Height" value={customerInfo.height} suffix=" cm" />
                <InfoRow label="Weight" value={customerInfo.weight} suffix=" kg" last />
              </Card>

              {/* 3. Fitness Info */}
              <Text style={styles.sectionHeading}>Fitness Info</Text>
              <Card>
                <InfoRow label="Fitness Goal" value={prettyEnum(customerInfo.fitness_goal)} />
                <InfoRow label="Daily Routine" value={prettyEnum(customerInfo.daily_routine)} />
                <InfoRow label="Special Focus" value={customerInfo.special_focus} last />
              </Card>

              {/* 4. Lifestyle */}
              <Text style={styles.sectionHeading}>Lifestyle</Text>
              <Card>
                <InfoRow label="Diet" value={prettyEnum(customerInfo.dietary_preference)} />
                <InfoRow label="Smoking" value={prettyEnum(customerInfo.smoking)} />
                <InfoRow label="Alcohol" value={prettyEnum(customerInfo.alcohol_frequency)} />
                <InfoRow label="Medical Conditions" value={customerInfo.medical_conditions} last />
              </Card>

              {/* 5. Program Info */}
              <Text style={styles.sectionHeading}>Program</Text>
              <Card>
                <InfoRow
                  label="Program"
                  value={prettyEnum(customerInfo.program_enrolled)}
                  last
                />
              </Card>

              {/* 6. Trainer Info — rendered only if data is present */}
              {customerInfo.trainer_name || customerInfo.trainer_specialization ? (
                <>
                  <Text style={styles.sectionHeading}>Trainer</Text>
                  <Card>
                    <InfoRow label="Name" value={customerInfo.trainer_name} />
                    <InfoRow
                      label="Specialization"
                      value={customerInfo.trainer_specialization}
                      last
                    />
                  </Card>
                </>
              ) : null}
            </>
          ) : (
            <Text style={styles.emptyText}>No customer profile found.</Text>
          )
        )}

        {role === 'trainer' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Trainer Details</Text>
            {trainerLoading ? (
              <ActivityIndicator size="large" color="#ffc803" style={{ marginVertical: 24 }} />
            ) : trainerInfo ? (
              <>
                {/* Profile photo block (view + edit) */}
                <View style={styles.fieldRow}>
                  <Text style={styles.label}>Profile Photo</Text>
                  {isEditing ? (
                    <View style={styles.photoEditRow}>
                      {trainerDisplayPhoto ? (
                        <Image source={{ uri: trainerDisplayPhoto }} style={styles.photoPreview} />
                      ) : (
                        <View style={[styles.photoPreview, styles.photoPlaceholder]}>
                          <Ionicons name="image-outline" size={22} color="#6b6360" />
                        </View>
                      )}
                      <TouchableOpacity
                        style={[styles.btnBase, styles.btnGhost, styles.photoPickBtn]}
                        onPress={handlePickTrainerPhoto}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                        <Text style={styles.btnGhostText}>
                          {trainerImageUri ? 'Change Photo' : 'Upload Photo'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : trainerExistingPhoto ? (
                    <Image source={{ uri: trainerExistingPhoto }} style={styles.photoPreview} />
                  ) : (
                    <Text style={styles.value}>N/A</Text>
                  )}
                </View>

                {TRAINER_FIELDS.map((f) => (
                  <View key={f.key} style={styles.fieldRow}>
                    <Text style={styles.label}>{f.label}</Text>
                    {isEditing ? (
                      <TextInput
                        style={[styles.input, f.multiline && { minHeight: 80, textAlignVertical: 'top' }]}
                        value={form[f.key]}
                        onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                        placeholder={f.label}
                        placeholderTextColor="#6b6360"
                        keyboardType={f.keyboard || 'default'}
                        maxLength={f.maxLength}
                        multiline={!!f.multiline}
                      />
                    ) : (
                      <Text style={styles.value}>{trainerInfo[f.key] || 'N/A'}</Text>
                    )}
                  </View>
                ))}

                {showTrainerEdit && (
                  <View style={styles.inlineBtnRow}>
                    <TouchableOpacity
                      style={[styles.btnBase, styles.btnGhost]}
                      onPress={handleCancel}
                      disabled={saving}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.btnGhostText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnBase, styles.btnPrimary]}
                      onPress={handleSave}
                      disabled={saving}
                      activeOpacity={0.8}
                    >
                      {saving ? (
                        <ActivityIndicator color="#1a1716" />
                      ) : (
                        <Text style={styles.btnPrimaryText}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>
                No trainer profile found or pending verification.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer action bar — visually balanced, role-aware */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {showTrainerUpdateBtn ? (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.btnBase, styles.btnDangerGhost, styles.footerBtn]}
              onPress={confirmLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={styles.btnDangerGhostText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnBase, styles.btnPrimary, styles.footerBtn]}
              onPress={handleEdit}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={18} color="#1a1716" />
              <Text style={styles.btnPrimaryText}>Update Profile</Text>
            </TouchableOpacity>
          </View>
        ) : showCustomerUpdateBtn ? (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.btnBase, styles.btnDangerGhost, styles.footerBtn]}
              onPress={confirmLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={styles.btnDangerGhostText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnBase, styles.btnPrimary, styles.footerBtn]}
              onPress={openCustomerEdit}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={18} color="#1a1716" />
              <Text style={styles.btnPrimaryText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.btnBase, styles.btnDangerGhost, styles.footerBtnFull]}
            onPress={confirmLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={styles.btnDangerGhostText}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Customer edit modal */}
      <Modal
        visible={customerModalOpen}
        animationType="slide"
        transparent
        onRequestClose={closeCustomerEdit}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={closeCustomerEdit} disabled={customerSaving}>
                <Ionicons name="close" size={22} color="#a09890" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 440 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Profile Photo</Text>
                <View style={styles.photoEditRow}>
                  {customerDisplayPhoto ? (
                    <Image source={{ uri: customerDisplayPhoto }} style={styles.photoPreview} />
                  ) : (
                    <View style={[styles.photoPreview, styles.photoPlaceholder]}>
                      <Ionicons name="image-outline" size={22} color="#6b6360" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.btnBase, styles.btnGhost, styles.photoPickBtn]}
                    onPress={handlePickCustomerPhoto}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={styles.btnGhostText}>
                      {customerImageUri ? 'Change Photo' : 'Upload Photo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.label}>Mobile (10 digits)</Text>
                <TextInput
                  style={styles.input}
                  value={customerForm.mobile}
                  onChangeText={(v) =>
                    setCustomerForm((p) => ({ ...p, mobile: v.replace(/\D/g, '').slice(0, 10) }))
                  }
                  placeholder="9876543210"
                  placeholderTextColor="#6b6360"
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                  value={customerForm.address}
                  onChangeText={(v) => setCustomerForm((p) => ({ ...p, address: v }))}
                  placeholder="Street, city, state"
                  placeholderTextColor="#6b6360"
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.inlineBtnRow}>
              <TouchableOpacity
                style={[styles.btnBase, styles.btnGhost]}
                onPress={closeCustomerEdit}
                disabled={customerSaving}
                activeOpacity={0.8}
              >
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnBase, styles.btnPrimary]}
                onPress={handleCustomerSave}
                disabled={customerSaving}
                activeOpacity={0.8}
              >
                {customerSaving ? (
                  <ActivityIndicator color="#1a1716" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1a1716' },
  contentContainer: { paddingHorizontal: 20, paddingTop: 20 },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffc803',
    marginBottom: 18,
    letterSpacing: 0.3,
  },

  // Identity header
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252120',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#332e2b',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,200,3,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,200,3,0.35)',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#ffc803', fontSize: 22, fontWeight: '800' },
  identityText: { flex: 1, marginLeft: 14 },
  identityName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(255,200,3,0.10)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  roleChipText: {
    color: '#ffc803',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  // Cards
  card: {
    backgroundColor: '#252120',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#332e2b',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffc803',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fieldRow: { marginTop: 14 },
  label: {
    fontSize: 11,
    color: '#a09890',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
    marginBottom: 6,
  },
  value: { fontSize: 15, color: '#fff', fontWeight: '600' },
  emptyText: { color: '#a09890', fontSize: 14, marginTop: 12 },

  input: {
    borderWidth: 1,
    borderColor: '#332e2b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fff',
    backgroundColor: '#1f1b1a',
  },

  // Photo preview + edit row
  photoPreview: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#1f1b1a',
    borderWidth: 1,
    borderColor: '#332e2b',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photoPickBtn: { flex: 1, minHeight: 44, paddingVertical: 10 },

  // Inline (in-card) button row used during edit
  inlineBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },

  // Shared button base
  btnBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    minHeight: 50,
  },
  btnPrimary: { backgroundColor: '#ffc803', flex: 1 },
  btnPrimaryText: { color: '#1a1716', fontSize: 15, fontWeight: '700' },
  btnGhost: {
    backgroundColor: '#1f1b1a',
    borderWidth: 1,
    borderColor: '#332e2b',
    flex: 1,
  },
  btnGhostText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnDangerGhost: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.45)',
  },
  btnDangerGhostText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },

  // Footer action bar
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#1a1716',
    borderTopWidth: 1,
    borderTopColor: '#252120',
  },
  footerRow: { flexDirection: 'row', gap: 12 },
  footerBtn: { flex: 1 },
  footerBtnFull: { width: '100%' },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#252120',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#332e2b',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#ffc803',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ── Customer premium layout ──
  sectionHeading: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 10,
    letterSpacing: 0.2,
  },

  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginBottom: 8,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,200,3,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffc803',
    overflow: 'hidden',
  },
  profileAvatarImg: { width: '100%', height: '100%' },
  profileAvatarText: {
    color: '#ffc803',
    fontSize: 24,
    fontWeight: '800',
  },
  profileName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  profileMeta: {
    color: '#b3b3b3',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
