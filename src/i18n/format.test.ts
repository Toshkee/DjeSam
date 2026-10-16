import { createFormatters, parseMoneyToCents } from './format';
import { me } from './locales/me';
import { pluralCategory } from './plural';

const f = createFormatters(me);
const MIN = 60_000;

describe('pluralCategory', () => {
  it.each([
    [1, 'one'],
    [21, 'one'],
    [11, 'other'],
    [2, 'few'],
    [4, 'few'],
    [24, 'few'],
    [12, 'other'],
    [5, 'other'],
    [0, 'other'],
  ])('%i → %s', (n, expected) => {
    expect(pluralCategory(n)).toBe(expected);
  });
});

describe('durations', () => {
  it('formats compact durations', () => {
    expect(f.durationShort(45 * MIN)).toBe('45 min');
    expect(f.durationShort(80 * MIN)).toBe('1 h 20 min');
    expect(f.durationShort(120 * MIN)).toBe('2 h');
    expect(f.durationShort((3 * 1440 + 4 * 60) * MIN)).toBe('3 dana 4 h');
    expect(f.durationShort(1440 * MIN)).toBe('1 dan');
  });

  it('spells out durations with correct plurals', () => {
    expect(f.durationLong(1 * MIN)).toBe('1 minut');
    expect(f.durationLong(3 * MIN)).toBe('3 minuta');
    expect(f.durationLong(10 * MIN)).toBe('10 minuta');
    expect(f.durationLong(60 * MIN)).toBe('1 sat');
    expect(f.durationLong(150 * MIN)).toBe('2 sata 30 minuta');
    expect(f.durationLong(5 * 60 * MIN)).toBe('5 sati');
  });

  it('rounds countdowns up', () => {
    expect(f.countdown(30_000)).toBe('1 min');
    expect(f.countdown(0)).toBe('0 min');
    expect(f.countdown(65 * MIN)).toBe('1 h 05 min');
  });
});

describe('distance', () => {
  it('formats metres and kilometres with a decimal comma', () => {
    expect(f.distance(3)).toBe('5 m');
    expect(f.distance(42)).toBe('40 m');
    expect(f.distance(847)).toBe('850 m');
    expect(f.distance(1234)).toBe('1,2 km');
    expect(f.distance(14_600)).toBe('15 km');
  });
});

describe('dates', () => {
  const now = new Date(2026, 9, 16, 18, 0).getTime();

  it('uses today / yesterday wording', () => {
    expect(f.relativeDateTime(new Date(2026, 9, 16, 9, 5).getTime(), now)).toBe('danas u 09:05');
    expect(f.relativeDateTime(new Date(2026, 9, 15, 22, 40).getTime(), now)).toBe('juče u 22:40');
    expect(f.relativeDateTime(new Date(2026, 9, 2, 8, 0).getTime(), now)).toBe('2. okt u 08:00');
    expect(f.relativeDateTime(new Date(2025, 11, 31, 8, 0).getTime(), now)).toBe('31. dec 2025. u 08:00');
  });

  it('formats long dates in Montenegrin', () => {
    expect(f.longDateTime(new Date(2026, 9, 16, 14, 5).getTime())).toBe('petak, 16. oktobar 2026. u 14:05');
  });
});

describe('money', () => {
  it('formats cents as EUR', () => {
    expect(f.money(250)).toBe('2,50 €');
  });

  it('parses user input', () => {
    expect(parseMoneyToCents('')).toBeNull();
    expect(parseMoneyToCents('1,5')).toBe(150);
    expect(parseMoneyToCents('2.25')).toBe(225);
    expect(parseMoneyToCents('3 €')).toBe(300);
    expect(parseMoneyToCents('abc')).toBeNaN();
    expect(parseMoneyToCents('1,234')).toBeNaN();
  });
});
