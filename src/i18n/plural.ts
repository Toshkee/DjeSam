export type PluralCategory = 'one' | 'few' | 'other';

/**
 * Plural rules shared by Montenegrin, Serbian, Bosnian and Croatian (CLDR):
 * 1, 21, 31… → one; 2–4, 22–24… → few; everything else → other.
 */
export function pluralCategory(n: number): PluralCategory {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'other';
}

export type PluralForms = Record<PluralCategory, string>;

export function plural(n: number, forms: PluralForms): string {
  return forms[pluralCategory(n)];
}
