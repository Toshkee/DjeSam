import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createFormatters, type Formatters } from './format';
import { me, type Strings } from './locales/me';

export type { Strings } from './locales/me';
export type { Formatters } from './format';

/** Registered locales. Add e.g. `en` here once its dictionary implements `Strings`. */
export const locales = { me } satisfies Record<string, Strings>;
export type LocaleId = keyof typeof locales;
export const DEFAULT_LOCALE: LocaleId = 'me';

interface I18nValue {
  locale: LocaleId;
  t: Strings;
  f: Formatters;
}

const defaultValue: I18nValue = { locale: DEFAULT_LOCALE, t: me, f: createFormatters(me) };
const I18nContext = createContext<I18nValue>(defaultValue);

export function I18nProvider({ locale = DEFAULT_LOCALE, children }: { locale?: LocaleId; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => {
    const t = locales[locale];
    return { locale, t, f: createFormatters(t) };
  }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

/**
 * Non-React access for services (e.g. notification content scheduled outside a component).
 * Kept in sync with the provider's locale through `setActiveLocale`.
 */
let active: I18nValue = defaultValue;
export function setActiveLocale(locale: LocaleId) {
  const t = locales[locale];
  active = { locale, t, f: createFormatters(t) };
}
export function getI18n(): I18nValue {
  return active;
}
