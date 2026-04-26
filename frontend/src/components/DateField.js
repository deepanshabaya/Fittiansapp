import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// Reusable date input that opens the native calendar. Stores value as the same
// 'YYYY-MM-DD' string the rest of the app already uses, so call sites do not
// have to change their submit/validation logic.
//
// props:
//   value         — 'YYYY-MM-DD' or '' (empty)
//   onChange(str) — receives 'YYYY-MM-DD' or '' on clear
//   placeholder   — shown when value is empty
//   minimumDate   — optional Date
//   maximumDate   — optional Date
//   style         — outer container override
//   disabled      — disables the touch
export default function DateField({
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  style,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  const parsed = value ? parseYMD(value) : null;
  const display = parsed ? formatDisplay(parsed) : '';

  const handleAndroidPick = (event, selectedDate) => {
    setOpen(false);
    if (event?.type === 'set' && selectedDate) {
      onChange(toYMD(selectedDate));
    }
  };

  const handleIOSConfirm = () => {
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.field, style, disabled && styles.fieldDisabled]}
      >
        <Text style={[styles.text, !display && styles.placeholder]} numberOfLines={1}>
          {display || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color="#ffc803" />
      </TouchableOpacity>

      {open && Platform.OS === 'android' && (
        <DateTimePicker
          value={parsed || new Date()}
          mode="date"
          display="calendar"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleAndroidPick}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={styles.iosBackdrop}>
            <View style={styles.iosSheet}>
              <DateTimePicker
                value={parsed || new Date()}
                mode="date"
                display="inline"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(e, d) => d && onChange(toYMD(d))}
                themeVariant="dark"
              />
              <TouchableOpacity style={styles.iosDone} onPress={handleIOSConfirm} activeOpacity={0.7}>
                <Text style={styles.iosDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

// ── helpers (kept local so consumers don't have to import them) ──
function pad(n) { return n < 10 ? `0${n}` : `${n}`; }

function toYMD(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseYMD(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function formatDisplay(d) {
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#332e2b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#1f1b1a',
    gap: 10,
  },
  fieldDisabled: { opacity: 0.5 },
  text: { color: '#fff', fontSize: 14, flex: 1 },
  placeholder: { color: '#6b6360' },

  iosBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  iosSheet: {
    backgroundColor: '#252120',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: '#332e2b',
  },
  iosDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#ffc803',
    borderRadius: 12,
    marginTop: 8,
  },
  iosDoneText: { color: '#1a1716', fontWeight: '700' },
});
