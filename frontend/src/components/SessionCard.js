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
    backgroundColor: '#252120', borderRadius: 12, padding: 14, marginVertical: 6,
    borderWidth: 1, borderColor: '#332e2b',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 14, fontWeight: '500', color: '#ffffff' },
  status: { fontSize: 12, color: '#ffc803', fontWeight: '600', textTransform: 'uppercase' },
  time: { marginTop: 4, fontSize: 13, color: '#a09890' },
});

