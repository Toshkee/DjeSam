import { ActionSheetIOS, Alert, Linking, Platform, Share } from 'react-native';

import type { Strings } from '@/i18n';
import type { Coordinates } from '@/features/parking/types';

import { directionsUrl, providersForPlatform, shareableLocationUrl, type MapsProvider } from './urls';

async function canOpen(url: string): Promise<boolean> {
  try {
    return await Linking.canOpenURL(url);
  } catch {
    return false;
  }
}

function providerLabel(t: Strings, p: MapsProvider): string {
  switch (p) {
    case 'apple':
      return t.returnToCar.appleMaps;
    case 'google-app':
      return t.returnToCar.googleMaps;
    case 'android-geo':
      return t.returnToCar.otherApp;
    case 'google-web':
      return Platform.OS === 'android' ? t.returnToCar.googleMaps : t.returnToCar.browser;
  }
}

async function openProvider(t: Strings, provider: MapsProvider, car: Coordinates): Promise<void> {
  const url = directionsUrl(provider, car, t.map.markerTitle);
  try {
    await Linking.openURL(url);
  } catch {
    // Last resort: the web URL works in any browser.
    if (provider !== 'google-web') {
      try {
        await Linking.openURL(directionsUrl('google-web', car));
        return;
      } catch {
        // fall through
      }
    }
    Alert.alert(t.common.errorTitle, t.returnToCar.noMapsApp);
  }
}

export async function shareCarLocation(t: Strings, car: Coordinates): Promise<void> {
  const url = shareableLocationUrl(car);
  await Share.share({ message: t.returnToCar.shareMessage(url) }).catch(() => undefined);
}

/**
 * Lets the user pick a maps app for walking directions. Only apps that are actually available
 * are offered; https links guarantee a working fallback even with no maps app installed.
 */
export async function openDirections(t: Strings, car: Coordinates): Promise<void> {
  const googleInstalled =
    Platform.OS === 'ios' ? await canOpen(directionsUrl('google-app', car)) : false;
  const providers = providersForPlatform(Platform.OS, googleInstalled);
  const options = providers.map((p) => providerLabel(t, p));

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t.returnToCar.openIn,
        options: [...options, t.returnToCar.shareLocation, t.common.cancel],
        cancelButtonIndex: options.length + 1,
      },
      (index) => {
        const provider = providers[index];
        if (provider) void openProvider(t, provider, car);
        else if (index === options.length) void shareCarLocation(t, car);
      },
    );
    return;
  }

  // Android dialogs show at most three buttons; dismissing by tapping outside cancels.
  Alert.alert(
    t.returnToCar.openIn,
    undefined,
    [
      ...providers.map((p, i) => ({ text: options[i] ?? '', onPress: () => void openProvider(t, p, car) })),
      { text: t.returnToCar.shareLocation, onPress: () => void shareCarLocation(t, car) },
    ].slice(0, 3),
    { cancelable: true },
  );
}
