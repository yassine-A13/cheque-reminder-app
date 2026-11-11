import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { useAuth } from '@/providers/AuthProvider';
import { useAppTheme } from '@/providers/ThemeProvider';
import { ExportFilterProvider } from '@/features/export/ExportFilterContext';

export default function TabsLayout() {
  const { authReady, hasPin, isAuthenticated } = useAuth();
  const { colors } = useAppTheme();

  if (!authReady) {
    return null;
  }

  if (!hasPin) {
    return <Redirect href="/setup-pin" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/unlock" />;
  }

  return (
    <ExportFilterProvider>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 68,
          paddingBottom: 10,
          paddingTop: 10,
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tableau de bord',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="grid-outline"
              size={size}
              color={focused ? colors.primary : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cheques"
        options={{
          title: 'Chèques',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="receipt-outline"
              size={size}
              color={focused ? colors.primary : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Réglages',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="settings-outline"
              size={size}
              color={focused ? colors.primary : colors.textMuted}
            />
          ),
        }}
      />
    </Tabs>
    </ExportFilterProvider>
  );
}
