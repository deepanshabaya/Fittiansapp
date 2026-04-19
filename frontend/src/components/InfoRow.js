import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function InfoRow({ label, value, prefix = '', suffix = '', last = false }) {
  const display = value != null && value !== '' ? `${prefix}${value}${suffix}` : '—';
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={2}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2a28',
  },
  rowLast: { borderBottomWidth: 0 },
  label: { color: '#b3b3b3', fontSize: 13, flex: 1 },
  value: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '55%',
    textAlign: 'right',
  },
});
