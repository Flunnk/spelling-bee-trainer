import { DictionaryEntry } from '../types';

const dictCache: Record<string, DictionaryEntry | null> = {};

export const fetchDefinition = async (word: string): Promise<DictionaryEntry | null> => {
  if (dictCache[word] !== undefined) return dictCache[word];

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!res.ok) throw new Error('Not found');
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      dictCache[word] = data[0];
      return data[0];
    }
  } catch (e) {
    console.error("Dictionary fetch failed:", e);
    // silent fail
  }

  dictCache[word] = null;
  return null;
};