import { plural } from './plural';
import type { Strings } from './locales/me';

const MINUTE = 60_000;
const DAY = 86_400_000;

const pad2 = (n: number) => String(n).padStart(2, '0');

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Locale-aware formatters. Implemented by hand rather than with `Intl` because
 * Montenegrin locale data is not reliably shipped by every JS engine/OS combination.
 */
export function createFormatters(s: Strings) {
  const { units, dates } = s;

  function decimal(value: number, fractionDigits: number): string {
    return value.toFixed(fractionDigits).replace('.', units.decimalSeparator);
  }

  /** 24-hour clock, e.g. "14:05". */
  function time(ms: number): string {
    const d = new Date(ms);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  /** e.g. "16. okt 2026." (year omitted for the current year). */
  function date(ms: number, now = Date.now()): string {
    const d = new Date(ms);
    const base = `${d.getDate()}. ${dates.monthsShort[d.getMonth()]}`;
    return d.getFullYear() === new Date(now).getFullYear() ? base : `${base} ${d.getFullYear()}.`;
  }

  /** "danas u 14:05", "juče u 09:10", "12. okt u 18:00". */
  function relativeDateTime(ms: number, now = Date.now()): string {
    const dayDiff = Math.round((startOfDay(now) - startOfDay(ms)) / DAY);
    const t = `${dates.at} ${time(ms)}`;
    if (dayDiff === 0) return `${dates.today} ${t}`;
    if (dayDiff === 1) return `${dates.yesterday} ${t}`;
    return `${date(ms, now)} ${t}`;
  }

  /** Full date for detail views: "petak, 16. oktobar 2026. u 14:05". */
  function longDateTime(ms: number): string {
    const d = new Date(ms);
    return `${dates.weekdays[d.getDay()]}, ${d.getDate()}. ${dates.months[d.getMonth()]} ${d.getFullYear()}. ${dates.at} ${time(ms)}`;
  }

  /** Compact duration: "45 min", "1 h 20 min", "2 h", "3 dana 4 h". */
  function durationShort(ms: number): string {
    const totalMinutes = Math.max(0, Math.round(ms / MINUTE));
    if (totalMinutes < 60) return `${totalMinutes} ${units.minuteShort}`;
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) {
      const dayPart = `${days} ${plural(days, units.day)}`;
      return hours > 0 ? `${dayPart} ${hours} ${units.hourShort}` : dayPart;
    }
    return minutes > 0
      ? `${hours} ${units.hourShort} ${minutes} ${units.minuteShort}`
      : `${hours} ${units.hourShort}`;
  }

  /** Spelled-out duration for notifications: "10 minuta", "1 sat", "2 sata 30 minuta". */
  function durationLong(ms: number): string {
    const totalMinutes = Math.max(0, Math.round(ms / MINUTE));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} ${plural(hours, units.hour)}`);
    if (minutes > 0 || hours === 0) parts.push(`${minutes} ${plural(minutes, units.minute)}`);
    return parts.join(' ');
  }

  /** Countdown text: "42 min", "1 h 05 min" — rounds up so "0 min" only shows at expiry. */
  function countdown(ms: number): string {
    const totalMinutes = Math.max(0, Math.ceil(ms / MINUTE));
    if (totalMinutes < 60) return `${totalMinutes} ${units.minuteShort}`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} ${units.hourShort} ${pad2(minutes)} ${units.minuteShort}`;
  }

  /** "35 m", "850 m", "1,2 km", "14 km". */
  function distance(meters: number): string {
    if (!Number.isFinite(meters) || meters < 0) return '';
    if (meters < 1000) {
      const rounded = meters < 100 ? Math.round(meters / 5) * 5 : Math.round(meters / 10) * 10;
      return `${Math.max(rounded, 5)} ${units.meters}`;
    }
    const km = meters / 1000;
    return `${km < 10 ? decimal(km, 1) : Math.round(km)} ${units.kilometers}`;
  }

  /** Whole metres for accuracy readouts: "±8 m" uses this as "8 m". */
  function meters(value: number): string {
    return `${Math.round(value)} ${units.meters}`;
  }

  /** "2,50 €" — amounts are stored in cents. */
  function money(cents: number): string {
    return `${decimal(cents / 100, 2)} ${units.currencySymbol}`;
  }

  /** "30 min", "1 h", "1 h 30 min" for timer presets. */
  function minutesLabel(minutes: number): string {
    return durationShort(minutes * MINUTE);
  }

  function coordinates(lat: number, lon: number): string {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }

  return {
    time,
    date,
    relativeDateTime,
    longDateTime,
    durationShort,
    durationLong,
    countdown,
    distance,
    meters,
    money,
    minutesLabel,
    coordinates,
  };
}

export type Formatters = ReturnType<typeof createFormatters>;

/**
 * Parses a user-entered amount such as "1,50", "2.5" or "3" into cents.
 * Returns null for empty input and NaN for invalid input.
 */
export function parseMoneyToCents(input: string): number | null {
  const trimmed = input.trim().replace(/\s|€/g, '');
  if (trimmed === '') return null;
  if (!/^\d{1,5}([.,]\d{1,2})?$/.test(trimmed)) return Number.NaN;
  const [whole, fraction = ''] = trimmed.replace(',', '.').split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function formatCentsForInput(cents: number | null, decimalSeparator: string): string {
  if (cents === null) return '';
  return (cents / 100).toFixed(2).replace('.', decimalSeparator);
}
