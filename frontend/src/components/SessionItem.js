import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { avatarUri } from '../services/api';

const STATUS_META = {
  completed: { label: 'Completed', color: '#22c55e' },
  missed: { label: 'Missed', color: '#ef4444' },
  pending: { label: 'Pending', color: '#b3b3b3' },
};

export default function SessionItem({
  customer,
  status,
  time,
  onPress,
  right,
  divider = false,
}) {
  const name = customer?.name || '—';
  const address = customer?.address || '';
  const photo = avatarUri(customer?.upload_photo);
  const meta = STATUS_META[status] || STATUS_META.pending;

  const row = (
    <View style={styles.row}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>{(name || '?')[0]}</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {address ? (
          <Text style={styles.meta} numberOfLines={1}>{address}</Text>
        ) : null}
      </View>

      <View style={styles.tail}>
        {time ? <Text style={styles.time}>{time}</Text> : null}
        <View style={[styles.statusPill, { backgroundColor: `${meta.color}22` }]}>
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        {right ? <View style={styles.rightSlot}>{right}</View> : null}
      </View>
    </View>
  );

  return (
    <View>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {row}
        </TouchableOpacity>
      ) : (
        row
      )}
      {divider ? <View style={styles.divider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#1f1b1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#ffc803', fontSize: 17, fontWeight: '700' },
  body: { flex: 1, minWidth: 0 },
  name: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  meta: { color: '#b3b3b3', fontSize: 12, marginTop: 2 },
  tail: { alignItems: 'flex-end', marginLeft: 10 },
  time: { color: '#ffffff', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  rightSlot: { marginTop: 6 },
  divider: {
    height: 1,
    backgroundColor: '#2e2a28',
    marginVertical: 2,
  },
});
