import React from 'react';
import { Text, StyleSheet } from 'react-native';

export default function SectionTitle({ children, style }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 8,
    marginBottom: 10,
  },
});
