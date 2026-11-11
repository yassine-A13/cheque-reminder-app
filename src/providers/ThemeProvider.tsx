import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, ThemePreference } from '@/constants/theme';

const STORAGE_KEY = 'settings.theme.preference';

type ThemeContextValue = {
  colors: typeof lightColors;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const resolvedScheme = preference === 'system' ? systemScheme ?? 'dark' : preference;
  const isDark = resolvedScheme === 'dark';

  useEffect(() => {
    const load = async () => {
      const value = await AsyncStorage.getItem(STORAGE_KEY);

      if (value === 'light' || value === 'dark' || value === 'system') {
        setPreferenceState(value);
      }
    };

    void load();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
      preference,
      setPreference: async (nextPreference) => {
        setPreferenceState(nextPreference);
        await AsyncStorage.setItem(STORAGE_KEY, nextPreference);
      },
    }),
    [isDark, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }

  return context;
}
