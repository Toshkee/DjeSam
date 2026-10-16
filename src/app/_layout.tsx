import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ToastProvider } from '@/components/ui/Toast';
import { getDb } from '@/db/client';
import { configureNotifications } from '@/features/notifications/reminders';
import { reconcileOnLaunch } from '@/features/parking/service';
import { SettingsProvider, useSettings } from '@/features/settings/SettingsProvider';
import { I18nProvider, useI18n } from '@/i18n';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [dbState, setDbState] = useState<'loading' | 'ready' | 'error'>('loading');

  const connect = useCallback(
    () =>
      getDb().then(
        () => setDbState('ready'),
        () => setDbState('error'),
      ),
    [],
  );

  useEffect(() => {
    connect();
  }, [connect]);

  const retry = () => {
    setDbState('loading');
    connect();
  };

  return (
    <SafeAreaProvider>
      <I18nProvider>
        {dbState === 'ready' ? (
          <SettingsProvider>
            <ThemedApp />
          </SettingsProvider>
        ) : (
          <ThemeProvider preference="system">
            <BootScreen state={dbState} onRetry={retry} />
          </ThemeProvider>
        )}
      </I18nProvider>
    </SafeAreaProvider>
  );
}

function BootScreen({ state, onRetry }: { state: 'loading' | 'error'; onRetry: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  useEffect(() => {
    if (state === 'error') SplashScreen.hideAsync().catch(() => undefined);
  }, [state]);
  if (state === 'loading') return <View style={[styles.fill, { backgroundColor: colors.background }]} />;
  return (
    <View style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
      <EmptyState icon="alert-circle-outline" title={t.common.errorTitle} body={t.common.genericError}>
        <Button label={t.common.retry} onPress={onRetry} />
      </EmptyState>
    </View>
  );
}

function ThemedApp() {
  const { settings, ready } = useSettings();
  return (
    <ThemeProvider preference={settings.theme}>
      {ready && <AppNavigator />}
    </ThemeProvider>
  );
}

function AppNavigator() {
  const { t } = useI18n();
  const { colors, scheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
    configureNotifications().catch(() => undefined);
    reconcileOnLaunch().catch(() => undefined);
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  // Tapping a parking reminder opens the map with the active session.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const sessionId = response.notification.request.content.data?.sessionId;
      if (typeof sessionId === 'string') router.navigate('/');
    });
    return () => sub.remove();
  }, [router]);

  return (
    <ToastProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTransparent: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.accentText,
          headerTitleStyle: { color: colors.text },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="save" options={{ presentation: 'modal', title: t.save.title }} />
        <Stack.Screen name="edit/[id]" options={{ presentation: 'modal', title: t.save.editTitle }} />
        <Stack.Screen name="session/[id]" options={{ title: t.details.title }} />
        <Stack.Screen name="return/[id]" options={{ title: t.returnToCar.title }} />
        <Stack.Screen
          name="timer/[id]"
          options={{
            presentation: 'formSheet',
            title: t.timer.title,
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            headerShown: false,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
      </Stack>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { justifyContent: 'center' },
});
