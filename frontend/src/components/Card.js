import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function Card({ style, children, padded = true }) {
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#242120',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2e2a28',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  padded: { padding: 16 },
});
