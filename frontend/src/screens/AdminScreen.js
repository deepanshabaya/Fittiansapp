import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../navigation/AppNavigator';

/**
 * AdminScreen — Landing screen for admin users.
 *
 * Provides two action cards:
 *  1. Create New User (Trainer / Customer)
 *  2. Trainer–Customer Mapping (placeholder, coming soon)
 */
export default function AdminScreen({ navigation }) {
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSubtitle}>Manage users & mappings</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#f87171" />
        </TouchableOpacity>
      </View>

      {/* Cards */}
      <View style={styles.container}>

        {/* Card 1: Create New User */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CreateUser')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="person-add" size={28} color="#2563eb" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Create New User</Text>
            <Text style={styles.cardDesc}>
              Add a new Trainer or Customer to the system
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        {/* Card 2: Edit User */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('EditUser')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#e0e7ff' }]}>
            <Ionicons name="create-outline" size={28} color="#4f46e5" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Edit User</Text>
            <Text style={styles.cardDesc}>
              Update customer or trainer details
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        {/* Card 3: Trainer–Customer Mapping */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('TrainerCustomerMapping')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="swap-horizontal" size={28} color="#d97706" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Trainer–Customer Mapping</Text>
            <Text style={styles.cardDesc}>
              Map trainers to their customers
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
});
