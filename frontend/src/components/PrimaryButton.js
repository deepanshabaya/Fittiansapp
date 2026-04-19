import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  variant = 'solid', // 'solid' | 'ghost'
  fullWidth = true,
  style,
  textStyle,
}) {
  const isGhost = variant === 'ghost';
  const isInactive = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isInactive}
      activeOpacity={0.85}
      style={[
        styles.base,
        isGhost ? styles.ghost : styles.solid,
        fullWidth && styles.fullWidth,
        isInactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? '#ffc803' : '#1a1716'} />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <Ionicons
              name={icon}
              size={16}
              color={isGhost ? '#ffc803' : '#1a1716'}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <Text
            style={[
              styles.text,
              isGhost ? styles.ghostText : styles.solidText,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  solid: {
    backgroundColor: '#ffc803',
    shadowColor: '#ffc803',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#ffc803',
  },
  disabled: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  solidText: { color: '#1a1716' },
  ghostText: { color: '#ffc803' },
});
