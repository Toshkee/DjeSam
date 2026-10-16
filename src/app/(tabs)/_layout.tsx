import { Tabs } from 'expo-router';

import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.map,
          tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'map' : 'map-outline'} size={24} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t.tabs.history,
          tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'time' : 'time-outline'} size={24} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.tabs.settings,
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'settings' : 'settings-outline'} size={24} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
