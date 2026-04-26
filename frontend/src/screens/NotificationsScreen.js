import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../navigation/AppNavigator';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/api';

const ICON_FOR_TYPE = {
  session_paused:    { name: 'pause-circle',  color: '#ffc803' },
  session_postponed: { name: 'time-outline',  color: '#3b82f6' },
  session_cancelled: { name: 'close-circle',  color: '#ef4444' },
};

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchNotifications({ token });
      setItems(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onItemPress = async (n) => {
    if (n.is_read) return;
    setItems(prev => prev.map(i => (i.id === n.id ? { ...i, is_read: true } : i)));
    setUnreadCount(c => Math.max(0, c - 1));
    try { await markNotificationRead({ token, id: n.id }); } catch (_) { /* best-effort */ }
  };

  const onMarkAll = async () => {
    if (unreadCount === 0) return;
    setItems(prev => prev.map(i => ({ ...i, is_read: true })));
    setUnreadCount(0);
    try { await markAllNotificationsRead({ token }); } catch (_) { /* best-effort */ }
  };

  const renderItem = ({ item }) => {
    const cfg = ICON_FOR_TYPE[item.type] || { name: 'notifications-outline', color: '#a09890' };
    return (
      <TouchableOpacity
        style={[styles.row, !item.is_read && styles.rowUnread]}
        activeOpacity={0.7}
        onPress={() => onItemPress(item)}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${cfg.color}22` }]}>
          <Ionicons name={cfg.name} size={20} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.message, !item.is_read && styles.messageUnread]} numberOfLines={3}>
            {item.message}
          </Text>
        </View>
        {!item.is_read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1716" />
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={onMarkAll} activeOpacity={0.7}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 && styles.emptyWrap}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#ffc803" />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color="#ffc803" style={{ marginTop: 24 }} />
          ) : (
            <View style={styles.emptyInner}>
              <Ionicons name="notifications-off-outline" size={42} color="#6b6360" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1716' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#252120',
  },
  title: { color: '#ffc803', fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  markAll: { color: '#ffc803', fontSize: 13, fontWeight: '600' },
  error: { color: '#ef4444', paddingHorizontal: 20, paddingVertical: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#252120',
    gap: 12,
  },
  rowUnread: { backgroundColor: '#1f1b1a' },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  message: { color: '#d6d0c8', fontSize: 14, lineHeight: 19 },
  messageUnread: { color: '#ffffff', fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffc803' },

  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  emptyInner: { alignItems: 'center', gap: 10 },
  emptyText: { color: '#6b6360', fontSize: 14 },
});
