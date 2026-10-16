import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Google Maps is only needed for the Android map tiles (iOS uses Apple Maps without a key).
 * Provide it at build time: GOOGLE_MAPS_ANDROID_API_KEY=... npx expo run:android
 */
const androidMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '';

/** Montenegrin flag red; the icon's gold underline echoes the flag's border. */
const FLAG_RED = '#C40308';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ĐeSam',
  slug: 'desam',
  scheme: 'desam',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#F4F6F9',
  ios: {
    bundleIdentifier: 'com.toshkee.desam',
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      // Needed so canOpenURL can detect an installed Google Maps app.
      LSApplicationQueriesSchemes: ['comgooglemaps'],
      CFBundleDevelopmentRegion: 'sr-Latn',
      CFBundleLocalizations: ['sr-Latn'],
    },
  },
  android: {
    package: 'com.toshkee.desam',
    adaptiveIcon: {
      backgroundColor: FLAG_RED,
      backgroundImage: './assets/android-icon-background.png',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'CAMERA'],
    blockedPermissions: ['android.permission.RECORD_AUDIO', 'android.permission.ACCESS_BACKGROUND_LOCATION'],
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-image',
    'expo-localization',
    'expo-font',
    'expo-dev-client',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 220,
        backgroundColor: FLAG_RED,
        dark: { image: './assets/splash-icon.png', backgroundColor: FLAG_RED },
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'ĐeSam koristi lokaciju dok je aplikacija otvorena da zapamti đe si parkirao i pokaže koliko si daleko od auta.',
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'ĐeSam koristi fotografije da uz parking sačuvaš sliku mjesta đe je auto.',
        cameraPermission: 'ĐeSam koristi kameru da uslikaš mjesto đe si parkirao.',
        microphonePermission: false,
      },
    ],
    [
      'expo-notifications',
      {
        color: FLAG_RED,
        defaultChannel: 'parking-reminders',
        enableRemoteNotifications: false,
      },
    ],
    ['react-native-maps', { androidGoogleMapsApiKey: androidMapsKey }],
    // In-app purchase capability for the one-time Premium unlock.
    'expo-iap',
  ],
  experiments: {
    typedRoutes: true,
  },
});
