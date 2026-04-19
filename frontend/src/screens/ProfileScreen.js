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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../navigation/AppNavigator';
import { fetchMyTrainerProfile, updateMyTrainerProfile } from '../services/api';

const TRAINER_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'mobileno', label: 'Mobile No' },
  { key: 'bio', label: 'Bio' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'introduction_video_url', label: 'Intro Video URL' },
  { key: 'profile', label: 'Profile Photo URL' },
];

export default function ProfileScreen() {
  const { user, role, token, logout } = useAuth();
  const [trainerInfo, setTrainerInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (role === 'trainer' && token) {
      setLoading(true);
      fetchMyTrainerProfile({ token })
        .then((data) => {
          const t = data.trainer || data;
          setTrainerInfo(t);
          populateForm(t);
        })
        .catch((err) => console.error('Error fetching trainer profile', err))
        .finally(() => setLoading(false));
    }
  }, [role, token]);

  const populateForm = (t) => {
    const f = {};
    TRAINER_FIELDS.forEach(({ key }) => {
      f[key] = t[key]?.toString() || '';
    });
    setForm(f);
  };

  const handleEdit = () => {
    if (trainerInfo) populateForm(trainerInfo);
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (trainerInfo) populateForm(trainerInfo);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const data = await updateMyTrainerProfile({ token, fields: form });
      const t = data.trainer || data;
      setTrainerInfo(t);
      populateForm(t);
      setIsEditing(false);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err) {
      Alert.alert('Update failed', err.message || 'Unable to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1716" />
      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || 'N/A'}</Text>

          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{role ? role.toUpperCase() : 'N/A'}</Text>
        </View>

        {role === 'trainer' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Trainer Details</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#ffc803" />
            ) : trainerInfo ? (
              <>
                {TRAINER_FIELDS.map((f) => (
                  <View key={f.key}>
                    <Text style={styles.label}>{f.label}</Text>
                    {isEditing ? (
                      <TextInput
                        style={styles.input}
                        value={form[f.key]}
                        onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                        placeholder={f.label}
                        placeholderTextColor="#6b6360"
                      />
                    ) : (
                      <Text style={styles.value}>{trainerInfo[f.key] || 'N/A'}</Text>
                    )}
                  </View>
                ))}

                <View style={styles.btnRow}>
                  {!isEditing ? (
                    <TouchableOpacity style={styles.editBtn} onPress={handleEdit} activeOpacity={0.8}>
                      <Text style={styles.editBtnText}>Update Profile</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={saving} activeOpacity={0.8}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                        {saving ? (
                          <ActivityIndicator color="#1a1716" />
                        ) : (
                          <Text style={styles.saveBtnText}>Save</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            ) : (
              <Text style={styles.value}>No trainer profile found or pending verification.</Text>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1a1716' },
  contentContainer: { paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#ffc803', marginBottom: 24, letterSpacing: 0.3 },
  card: {
    backgroundColor: '#252120', borderRadius: 16, padding: 24, marginBottom: 24,
    borderWidth: 1, borderColor: '#332e2b',
  },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: '#ffc803', marginBottom: 18,
    borderBottomWidth: 1, borderBottomColor: '#332e2b', paddingBottom: 8,
  },
  label: { fontSize: 12, color: '#a09890', marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' },
  value: { fontSize: 16, color: '#fff', fontWeight: '600', marginTop: 6 },
  input: {
    borderWidth: 1, borderColor: '#332e2b', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: '#fff', backgroundColor: '#1f1b1a', marginTop: 6,
  },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10 },
  editBtn: { backgroundColor: '#ffc803', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, alignItems: 'center' },
  editBtnText: { color: '#1a1716', fontSize: 16, fontWeight: '700' },
  cancelBtn: { backgroundColor: '#252120', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#332e2b' },
  cancelBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  saveBtn: { backgroundColor: '#ffc803', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, alignItems: 'center', minWidth: 90 },
  saveBtnText: { color: '#1a1716', fontSize: 16, fontWeight: '700' },
  button: { backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
