import { DictionaryEntry } from '../types';

const dictCache = new Map<string, DictionaryEntry | null>();
const MAX_CACHE_SIZE = 200;

function isValidDictionaryEntry(entry: unknown): entry is DictionaryEntry {
  if (!entry || typeof entry !== 'object') return false;
  const candidate = entry as Partial<DictionaryEntry>;
  return typeof candidate.word === 'string' && Array.isArray(candidate.meanings);
}

export const fetchDefinition = async (word: string): Promise<DictionaryEntry | null> => {
  const key = word.trim().toLowerCase();
  if (!key) return null;
  if (dictCache.has(key)) {
    const cached = dictCache.get(key) ?? null;
    dictCache.delete(key);
    dictCache.set(key, cached);
    return cached;
  }

  let result: DictionaryEntry | null = null;
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error('Not found');
    const data: unknown = await res.json();

    if (Array.isArray(data) && data.length > 0 && isValidDictionaryEntry(data[0])) {
      result = data[0];
    }
  } catch (e) {
    console.error('Dictionary fetch failed:', e);
  }

  dictCache.set(key, result);
  if (dictCache.size > MAX_CACHE_SIZE) {
    const oldest = dictCache.keys().next().value;
    if (oldest !== undefined) dictCache.delete(oldest);
  }
  return result;
};