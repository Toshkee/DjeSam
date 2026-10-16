const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j',
  к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
};

const isUpper = (ch: string | undefined) => !!ch && ch !== ch.toLowerCase();

/**
 * Serbian/Montenegrin Cyrillic → Latin. The OS geocoder often returns Cyrillic street names
 * for Montenegro, while the app is written in Latin script.
 */
export function cyrillicToLatin(input: string): string {
  let out = '';
  const chars = Array.from(input);
  chars.forEach((ch, i) => {
    const lower = ch.toLowerCase();
    const latin = MAP[lower];
    if (latin === undefined) {
      out += ch;
      return;
    }
    if (!isUpper(ch)) {
      out += latin;
      return;
    }
    // Digraphs (Lj, Nj, Dž) become fully upper-case only inside an upper-case word.
    const wordIsUpper = isUpper(chars[i + 1]) || (isUpper(chars[i - 1]) && !chars[i + 1]?.trim());
    out += wordIsUpper ? latin.toUpperCase() : latin.charAt(0).toUpperCase() + latin.slice(1);
  });
  return out;
}
