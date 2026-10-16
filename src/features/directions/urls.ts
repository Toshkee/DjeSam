import type { Coordinates } from '@/features/parking/types';

export type MapsProvider = 'apple' | 'google-app' | 'android-geo' | 'google-web';

const coord = ({ latitude, longitude }: Coordinates) => `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

/**
 * Walking-directions URLs for each supported maps app. All use the real saved coordinates;
 * routing is done by the maps app, never invented by ĐeSam.
 */
export function directionsUrl(provider: MapsProvider, destination: Coordinates, label?: string): string {
  const dest = coord(destination);
  switch (provider) {
    case 'apple':
      return `https://maps.apple.com/?daddr=${dest}&dirflg=w`;
    case 'google-app':
      // iOS Google Maps URL scheme; on Android the universal link below opens the app.
      return `comgooglemaps://?daddr=${dest}&directionsmode=walking`;
    case 'android-geo': {
      // Lets the user pick any installed maps app via the Android chooser.
      const q = encodeURIComponent(`${dest}${label ? `(${label})` : ''}`);
      return `geo:${dest}?q=${q}`;
    }
    case 'google-web':
      return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`;
  }
}

/** Shareable link that opens in any browser or maps app. */
export function shareableLocationUrl(destination: Coordinates): string {
  return `https://www.google.com/maps/search/?api=1&query=${coord(destination)}`;
}

/** Providers to offer, in order of preference, for a platform. */
export function providersForPlatform(
  os: 'ios' | 'android' | string,
  googleMapsInstalled: boolean,
): MapsProvider[] {
  if (os === 'ios') {
    return googleMapsInstalled ? ['apple', 'google-app'] : ['apple', 'google-web'];
  }
  if (os === 'android') return ['google-web', 'android-geo'];
  return ['google-web'];
}
