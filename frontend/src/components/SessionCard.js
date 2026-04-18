import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SessionCard({ session }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.date}>{session.session_date}</Text>
        <Text style={styles.status}>{session.status}</Text>
      </View>
      <Text style={styles.time}>
        {session.start_time} - {session.end_time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  status: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  time: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
});

