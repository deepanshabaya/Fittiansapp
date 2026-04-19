import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StatBox({ value, label, color = '#ffc803', icon }) {
  return (
    <View style={styles.box}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: hexToRgba(color, 0.12) }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
      ) : null}
      <Text style={[styles.value, { color }]}>{value ?? '—'}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: '#242120',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2e2a28',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: { fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },
  label: {
    fontSize: 11,
    color: '#b3b3b3',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
