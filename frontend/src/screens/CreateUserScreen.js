import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../navigation/AppNavigator';
import { adminCreateUser } from '../services/api';

// ────────────────────────────────────────────────────────
// Field definitions — keeps the form rendering DRY.
// Each field: { key, label, placeholder, keyboard, required, lines }
// ────────────────────────────────────────────────────────
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

export default function CreateUserScreen({ navigation }) {
  const { token } = useAuth();

  // Step tracking: 'role' → 'form'
  const [step, setStep] = useState('role');
  const [selectedRole, setSelectedRole] = useState(null);

  // Form state — holds all text field values keyed by field name
  const [formValues, setFormValues] = useState({});
  const [imageUri, setImageUri] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Picker modal state
  const [pickerModal, setPickerModal] = useState({ visible: false, field: null });

  // ── Image Picker ─────────────────────────────────────
  const pickImage = async () => {
    // Request gallery permission
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

  // ── Field change handler ─────────────────────────────
  const handleChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  // ── Picker helpers ───────────────────────────────────
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

  // ── Validation ───────────────────────────────────────
  const validate = () => {
    const fields = selectedRole === 'customer' ? CUSTOMER_FIELDS : TRAINER_FIELDS;
    const missing = fields
      .filter((f) => f.required && !formValues[f.key]?.trim())
      .map((f) => f.label.replace(' *', ''));

    if (missing.length) {
      Alert.alert('Missing fields', `Please fill: ${missing.join(', ')}`);
      return false;
    }

    // Mobile format: 10–15 digits
    const mobileKey = selectedRole === 'customer' ? 'mobile' : 'mobileno';
    const mobileVal = formValues[mobileKey];
    if (mobileVal && !/^\d{10,15}$/.test(mobileVal.trim())) {
      Alert.alert('Invalid mobile', 'Mobile must be 10–15 digits (numbers only).');
      return false;
    }

    // Numeric checks
    const numericFields = ['total_sessions', 'weight', 'height', 'amount_paid'];
    for (const key of numericFields) {
      const val = formValues[key];
      if (val && isNaN(Number(val))) {
        Alert.alert('Invalid value', `${key.replace(/_/g, ' ')} must be a number.`);
        return false;
      }
    }

    return true;
  };

  // ── Submit ───────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const imageFieldName = selectedRole === 'customer' ? 'upload_photo' : 'profile';

      const result = await adminCreateUser({
        token,
        role: selectedRole,
        formData: formValues,
        imageUri,
        imageFieldName,
      });

      Alert.alert(
        'Success ✅',
        result.message || `${selectedRole} created successfully!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Role Selection Step ──────────────────────────────
  if (step === 'role') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.roleContainer}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>

          <Text style={styles.roleTitle}>Create New User</Text>
          <Text style={styles.roleSubtitle}>
            Select the type of user to create
          </Text>

          {/* Trainer card */}
          <TouchableOpacity
            style={[styles.roleCard, selectedRole === 'trainer' && styles.roleCardActive]}
            onPress={() => setSelectedRole('trainer')}
          >
            <View style={[styles.roleIcon, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="barbell" size={30} color="#7c3aed" />
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleCardTitle}>Trainer</Text>
              <Text style={styles.roleCardDesc}>
                Fitness professional who trains customers
              </Text>
            </View>
            {selectedRole === 'trainer' && (
              <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
            )}
          </TouchableOpacity>

          {/* Customer card */}
          <TouchableOpacity
            style={[styles.roleCard, selectedRole === 'customer' && styles.roleCardActive]}
            onPress={() => setSelectedRole('customer')}
          >
            <View style={[styles.roleIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="person" size={30} color="#16a34a" />
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleCardTitle}>Customer</Text>
              <Text style={styles.roleCardDesc}>
                Client who receives training sessions
              </Text>
            </View>
            {selectedRole === 'customer' && (
              <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
            )}
          </TouchableOpacity>

          {/* Next button */}
          <TouchableOpacity
            style={[styles.primaryBtn, !selectedRole && styles.primaryBtnDisabled]}
            disabled={!selectedRole}
            onPress={() => {
              setFormValues({});
              setImageUri(null);
              setStep('form');
            }}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form Step ────────────────────────────────────────
  const fields = selectedRole === 'customer' ? CUSTOMER_FIELDS : TRAINER_FIELDS;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Form header */}
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={() => setStep('role')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.formHeaderTitle}>
            New {selectedRole === 'trainer' ? 'Trainer' : 'Customer'}
          </Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.formScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Image picker section */}
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={32} color="#94a3b8" />
                <Text style={styles.imagePickerText}>
                  {selectedRole === 'customer' ? 'Upload Photo' : 'Profile Image'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Dynamic fields */}
          {fields.map((field) => (
            <View key={field.key} style={styles.fieldGroup}>
              <Text style={styles.label}>{field.label}</Text>
              {field.type === 'picker' ? (
                <TouchableOpacity
                  style={styles.pickerTrigger}
                  onPress={() => openPicker(field)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerTriggerText, !formValues[field.key] && styles.pickerPlaceholder]}>
                    {getPickerLabel(field)}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={[styles.input, field.lines > 1 && { height: field.lines * 36, textAlignVertical: 'top' }]}
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
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closePicker}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>
                  {pickerModal.field?.label}
                </Text>
                <FlatList
                  data={pickerModal.field?.options ?? []}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => {
                    const selected = formValues[pickerModal.field?.key] === item.value;
                    return (
                      <TouchableOpacity
                        style={[styles.modalOption, selected && styles.modalOptionSelected]}
                        onPress={() => selectPickerOption(item.value)}
                      >
                        <Text style={[styles.modalOptionText, selected && styles.modalOptionTextSelected]}>
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
            style={[styles.primaryBtn, isSubmitting && styles.primaryBtnDisabled]}
            disabled={isSubmitting}
            onPress={handleSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Create {selectedRole === 'trainer' ? 'Trainer' : 'Customer'}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Spacer at bottom */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flex: {
    flex: 1,
  },

  // ── Back button ──
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Role selection step ──
  roleContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  roleTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 24,
  },
  roleSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 28,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  roleCardActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: {
    flex: 1,
    marginLeft: 14,
  },
  roleCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
  },
  roleCardDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // ── Form step ──
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  formHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  formScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // ── Image picker ──
  imagePicker: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  imagePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
  },
  imagePreview: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#2563eb',
  },
  imagePickerText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },

  // ── Fields ──
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#0f172a',
  },

  // ── Picker trigger ──
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  pickerTriggerText: {
    fontSize: 15,
    color: '#0f172a',
  },
  pickerPlaceholder: {
    color: '#94a3b8',
  },

  // ── Picker modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  modalOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#1e293b',
  },
  modalOptionTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },

  // ── Primary button ──
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
