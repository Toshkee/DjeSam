import { Platform } from 'react-native';
import type { MapViewProps } from 'react-native-maps';

import { MAP_STYLES, type MapStyle } from './settings';
import { useSettings } from './SettingsProvider';

/** Apple Maps has no terrain layer, so it is only offered on Android. */
export const AVAILABLE_MAP_STYLES: readonly MapStyle[] =
  Platform.OS === 'android' ? MAP_STYLES : MAP_STYLES.filter((s) => s !== 'terrain');

/** The user's chosen map layer, resolved to a value the current platform supports. */
export function useMapType(): NonNullable<MapViewProps['mapType']> {
  const { settings } = useSettings();
  return AVAILABLE_MAP_STYLES.includes(settings.mapStyle) ? settings.mapStyle : 'standard';
}
