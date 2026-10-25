// Узбекская кириллица → латиница (по алфавиту 1995 г. с правками: oʻ, gʻ — U+02BB, тутуқ белгиси ʼ — U+02BC).
// Латиница в тексте (Bileto, SMS, QR, HTML-теги) не меняется.

const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ҳ: 'h', қ: 'q',
  ч: 'ch', ш: 'sh', щ: 'sh', ы: 'i', э: 'e', ё: 'yo', ю: 'yu', я: 'ya', ў: 'oʻ', ғ: 'gʻ',
  ъ: 'ʼ', ь: '',
};
const VOWELS = new Set('аеёиоуўэюяaeiou'.split(''));
const isCyr = (c) => c != null && /[Ѐ-ӿ]/.test(c);
const isUpper = (c) => c != null && c !== c.toLowerCase();

function letter(ch, prev, next) {
  const lo = ch.toLowerCase();
  const prevLo = prev?.toLowerCase();
  let out;
  if (lo === 'е') out = !prev || !isCyr(prev) || VOWELS.has(prevLo) || prevLo === 'ъ' || prevLo === 'ь' ? 'ye' : 'e';
  else if (lo === 'ц') out = prev && isCyr(prev) && VOWELS.has(prevLo) ? 'ts' : 's';
  else out = MAP[lo];
  if (out === undefined) return ch;
  if (!isUpper(ch) || !out) return out;
  // Целое слово капсом (СТИР) → STIR, иначе только первая буква: Шаҳар → Shahar.
  const wordCaps = (isUpper(next) && isCyr(next)) || (isUpper(prev) && isCyr(prev));
  return wordCaps ? out.toUpperCase() : out[0].toUpperCase() + out.slice(1);
}

export function toLatin(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) out += letter(s[i], s[i - 1], s[i + 1]);
  return out;
}

export const latinize = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toLatin(v)]));
