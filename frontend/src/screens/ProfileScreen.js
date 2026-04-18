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
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
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
              <ActivityIndicator size="large" color="#FFC107" />
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
                        placeholderTextColor="#777"
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
                          <ActivityIndicator color="#121212" />
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
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFC107',
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#FFC107',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFC107',
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#AFAFAF',
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#FFF',
    backgroundColor: '#2A2A2A',
    marginTop: 6,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  editBtn: {
    backgroundColor: '#FFC107',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
  },
  editBtnText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#FFC107',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    minWidth: 90,
  },
  saveBtnText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#EF4444',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
