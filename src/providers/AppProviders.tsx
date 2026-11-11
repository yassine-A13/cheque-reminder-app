import { PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Screen } from '@/components/Screen';
import { initializeDatabase } from '@/db/schema';
import { initializeNotifications } from '@/features/notifications/notification-service';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider, useAppTheme } from '@/providers/ThemeProvider';

function Bootstrap({ children }: PropsWithChildren) {
  const { colors } = useAppTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const boot = async () => {
      await initializeDatabase();
      await initializeNotifications();
      setReady(true);
    };

    void boot();
  }, []);

  if (!ready) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  return children;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Bootstrap>{children}</Bootstrap>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
