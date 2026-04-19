// Centralized theme for premium dark fitness app.
// Import: import { colors, fonts, cardStyle } from '../theme';

export const colors = {
  bg:         '#1a1716',
  card:       '#252120',
  cardBorder: '#332e2b',
  surface:    '#1f1b1a',

  accent:     '#ffc803',
  accentDim:  '#a68500',
  accentBg:   'rgba(255,200,3,0.10)',

  text:       '#ffffff',
  textSec:    '#a09890',
  textMuted:  '#6b6360',
  placeholder:'#6b6360',

  success:    '#22c55e',
  successBg:  'rgba(34,197,94,0.12)',
  danger:     '#ef4444',
  dangerBg:   'rgba(239,68,68,0.12)',
  info:       '#3b82f6',
  infoBg:     'rgba(59,130,246,0.12)',
  warning:    '#f59e0b',
  warningBg:  'rgba(245,158,11,0.12)',

  border:     '#2a2524',
  divider:    '#2a2524',
  inputBg:    '#1f1b1a',
  inputBorder:'#332e2b',

  white:      '#ffffff',
  black:      '#000000',
};

export const fonts = {
  h1:       { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: 0.3 },
  h2:       { fontSize: 22, fontWeight: '700', color: colors.text },
  h3:       { fontSize: 18, fontWeight: '600', color: colors.text },
  body:     { fontSize: 15, fontWeight: '400', color: colors.text },
  bodySec:  { fontSize: 14, fontWeight: '400', color: colors.textSec },
  caption:  { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  label:    { fontSize: 13, fontWeight: '600', color: colors.textSec, letterSpacing: 0.5, textTransform: 'uppercase' },
  button:   { fontSize: 16, fontWeight: '700', color: colors.bg },
};

export const cardStyle = {
  backgroundColor: colors.card,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.cardBorder,
  padding: 16,
};

export const inputStyle = {
  backgroundColor: colors.inputBg,
  borderWidth: 1,
  borderColor: colors.inputBorder,
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 15,
  color: colors.text,
};

export const btnPrimary = {
  backgroundColor: colors.accent,
  paddingVertical: 16,
  borderRadius: 14,
  alignItems: 'center',
};

export const btnOutline = {
  backgroundColor: 'transparent',
  borderWidth: 1.5,
  borderColor: colors.accent,
  paddingVertical: 16,
  borderRadius: 14,
  alignItems: 'center',
};
