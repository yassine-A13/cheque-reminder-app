export type ThemePreference = 'system' | 'light' | 'dark';

type Accent = {
  background: string;
  text: string;
};

export type AppThemeColors = {
  background: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  success: Accent;
  warning: Accent;
  danger: Accent;
  neutral: Accent;
  shadow: string;
};

export const lightColors: AppThemeColors = {
  background: '#F6F1E8',
  surface: '#FFF9F0',
  card: '#FFFFFF',
  border: '#DED5C4',
  text: '#1E293B',
  textMuted: '#6B7280',
  primary: '#0F766E',
  primarySoft: '#DFF5F2',
  success: { background: '#DCFCE7', text: '#166534' },
  warning: { background: '#FEF3C7', text: '#92400E' },
  danger: { background: '#FEE2E2', text: '#B91C1C' },
  neutral: { background: '#E2E8F0', text: '#334155' },
  shadow: 'rgba(15, 23, 42, 0.08)',
};

export const darkColors: AppThemeColors = {
  background: '#0B1220',
  surface: '#111C2E',
  card: '#162235',
  border: '#26364D',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  primary: '#2DD4BF',
  primarySoft: '#123D38',
  success: { background: '#164E2A', text: '#BBF7D0' },
  warning: { background: '#5B3A10', text: '#FDE68A' },
  danger: { background: '#5C1E24', text: '#FECACA' },
  neutral: { background: '#334155', text: '#E2E8F0' },
  shadow: 'rgba(0, 0, 0, 0.35)',
};
