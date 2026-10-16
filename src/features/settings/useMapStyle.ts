import { Platform } from 'react-native';
import type { MapViewProps } from 'react-native-maps';

import { MAP_STYLES, type MapStyle } from './settings';
import { usePremium } from '@/features/premium/PremiumProvider';

import { useSettings } from './SettingsProvider';

/** Apple Maps has no terrain layer, so it is only offered on Android. */
export const AVAILABLE_MAP_STYLES: readonly MapStyle[] =
  Platform.OS === 'android' ? MAP_STYLES : MAP_STYLES.filter((s) => s !== 'terrain');

/** Every layer except the standard map is part of Premium. */
export const isPremiumMapStyle = (style: MapStyle) => style !== 'standard';

/** The user's chosen map layer, resolved to a value the current platform and plan support. */
export function useMapType(): NonNullable<MapViewProps['mapType']> {
  const { settings } = useSettings();
  const { isPremium } = usePremium();
  const style = settings.mapStyle;
  if (!AVAILABLE_MAP_STYLES.includes(style) || (isPremiumMapStyle(style) && !isPremium)) return 'standard';
  return style;
}
