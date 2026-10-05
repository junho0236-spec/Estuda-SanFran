import Dexie, { Table } from 'dexie';
import { supabase } from './supabaseClient';
import { geminiService } from './geminiService';
import {
  VOCAB_WORD_CLOUD_COLUMNS,
  VOCAB_SENTENCE_CLOUD_COLUMNS,
  toCloudVocabWord,
  toCloudVocabSentence,
} from '../utils/vocabCloudRowFormatters';

/**
 * Serviço do módulo "Vocab English" (aprendizado de vocabulário estilo Migaku).
 * Completamente isolado: usa um Dexie próprio (`SanFranVocabDB`) e as tabelas
 * Supabase `vocab_words` / `vocab_sentences` — nenhuma estrutura existente é
 * tocada. Se as tabelas ainda não existirem no Supabase (migration
 * `supabase/sql/vocab_english_complete_setup.sql` não executada), o módulo
 * continua funcionando em modo local-only e sinaliza `vocabCloudUnavailable`.
 */

export type VocabWordStatus = 'unknown' | 'learning' | 'known';

export interface VocabWordMeaning {
  pos: string;
  definition: string;
  example?: string;
}

export interface VocabWord {
  id: string;
  user_id: string;
  lemma: string;
  pos: string | null;
  definition_en: string | null;
  meanings: VocabWordMeaning[];
  translation_pt: string | null;
  phonetic: string | null;
  audio_url: string | null;
  status: VocabWordStatus;
  fsrs_snapshot: unknown | null;
  correct_streak: number;
  created_at: string;
  updated_at: string;
}

export interface VocabSentence {
  id: string;
  user_id: string;
  word_id: string;
  text_en: string;
  translation_pt: string | null;
  audio_url: string | null;
  fsrs_snapshot: unknown | null;
  /** Data local 'YYYY-MM-DD' da próxima revisão (null = nova, vencida agora). */
  next_review: string | null;
  created_at: string;
  updated_at: string;
}

interface VocabSyncQueueItem {
  id?: number;
  table: 'vocab_words' | 'vocab_sentences';
  action: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: string;
}

export interface VocabSyncFlushSummary {
  attempted: number;
  synced: number;
  pending: number;
}

interface VocabAudioCacheItem {
  url: string;
  blob: Blob;
  fetched_at: string;
}

export class SanFranVocabDB extends Dexie {
  vocab_words!: Table<VocabWord>;
  vocab_sentences!: Table<VocabSentence>;
  vocab_sync_queue!: Table<VocabSyncQueueItem>;
  vocab_audio_cache!: Table<VocabAudioCacheItem>;

  constructor() {
    super('SanFranVocabDB');
    this.version(1).stores({
      vocab_words: 'id, user_id, lemma, status',
      vocab_sentences: 'id, user_id, word_id, next_review',
      vocab_sync_queue: '++id, table, action, timestamp',
      vocab_audio_cache: 'url',
    });
  }
}

export const vocabDb = new SanFranVocabDB();

/* -------------------------------------------------------------------------- */
/*  Cloud availability                                                         */
/* -------------------------------------------------------------------------- */

let vocabCloudUnavailable = false;

export function isVocabCloudUnavailable(): boolean {
  return vocabCloudUnavailable;
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = String(error.code ?? '');
  const msg = String(error.message ?? '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('schema cache') ||
    (msg.includes('relation') && msg.includes('does not exist'))
  );
}

function noteCloudError(error: { code?: string; message?: string } | null) {
  if (isMissingTableError(error)) {
    if (!vocabCloudUnavailable) {
      console.warn(
        '[vocab] Tabelas vocab_* ausentes no Supabase — modo local-only. ' +
          'Execute supabase/sql/vocab_english_complete_setup.sql no SQL Editor.'
      );
    }
    vocabCloudUnavailable = true;
  }
}

const enqueue = async (item: Omit<VocabSyncQueueItem, 'id' | 'timestamp'>) => {
  await vocabDb.vocab_sync_queue.add({ ...item, timestamp: new Date().toISOString() });
};

export async function getVocabPendingSyncCount(): Promise<number> {
  return vocabDb.vocab_sync_queue.count();
}

/** Re-executa operações pendentes na nuvem. Chamado antes de leituras remotas. */
export async function flushVocabSyncQueue(isOnline: boolean): Promise<VocabSyncFlushSummary> {
  const pendingBefore = await vocabDb.vocab_sync_queue.count();
  if (!isOnline || vocabCloudUnavailable) {
    return { attempted: 0, synced: 0, pending: pendingBefore };
  }
  const items = await vocabDb.vocab_sync_queue.orderBy('id').toArray();
  let synced = 0;
  for (const item of items) {
    try {
      if (item.action === 'delete') {
        const { error } = await supabase.from(item.table).delete().eq('id', item.data.id);
        if (error) {
          noteCloudError(error);
          if (isMissingTableError(error)) {
            const pending = await vocabDb.vocab_sync_queue.count();
            return { attempted: items.length, synced, pending };
          }
          continue;
        }
      } else {
        const { error } = await supabase
          .from(item.table)
          .upsert(item.data, { onConflict: 'id' });
        if (error) {
          noteCloudError(error);
          if (isMissingTableError(error)) {
            const pending = await vocabDb.vocab_sync_queue.count();
            return { attempted: items.length, synced, pending };
          }
          continue;
        }
      }
      await vocabDb.vocab_sync_queue.delete(item.id!);
      synced += 1;
    } catch {
      // Sem conexão real — tenta de novo na próxima oportunidade.
      const pending = await vocabDb.vocab_sync_queue.count();
      return { attempted: items.length, synced, pending };
    }
  }
  const pending = await vocabDb.vocab_sync_queue.count();
  return { attempted: items.length, synced, pending };
}

/* -------------------------------------------------------------------------- */
/*  Words CRUD                                                                 */
/* -------------------------------------------------------------------------- */

export async function listVocabWords(userId: string, isOnline: boolean): Promise<VocabWord[]> {
  await flushVocabSyncQueue(isOnline);
  if (isOnline && !vocabCloudUnavailable) {
    const { data, error } = await supabase
      .from('vocab_words')
      .select(VOCAB_WORD_CLOUD_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      noteCloudError(error);
    } else if (data) {
      const mapped = data as VocabWord[];
      await vocabDb.vocab_words.bulkPut(mapped);
      return mapped;
    }
  }
  const rows = await vocabDb.vocab_words.where('user_id').equals(userId).toArray();
  return rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

export async function getVocabWordByLemma(
  userId: string,
  lemma: string
): Promise<VocabWord | undefined> {
  const normalized = lemma.trim().toLowerCase();
  const rows = await vocabDb.vocab_words.where('user_id').equals(userId).toArray();
  return rows.find((w) => w.lemma === normalized);
}

export async function saveVocabWord(word: VocabWord, isOnline: boolean): Promise<void> {
  await vocabDb.vocab_words.put(word);
  const payload = toCloudVocabWord(word as unknown as Record<string, unknown>);
  if (isOnline && !vocabCloudUnavailable) {
    const { error } = await supabase.from('vocab_words').upsert(payload, { onConflict: 'id' });
    if (error) {
      noteCloudError(error);
      if (!isMissingTableError(error)) {
        await enqueue({ table: 'vocab_words', action: 'update', data: payload });
      }
    }
  } else {
    await enqueue({ table: 'vocab_words', action: 'update', data: payload });
  }
}

export async function deleteVocabWord(wordId: string, isOnline: boolean): Promise<void> {
  const sentences = await vocabDb.vocab_sentences.where('word_id').equals(wordId).toArray();
  await vocabDb.vocab_sentences.bulkDelete(sentences.map((s) => s.id));
  await vocabDb.vocab_words.delete(wordId);

  const enqueueDelete = async () => {
    await enqueue({ table: 'vocab_words', action: 'delete', data: { id: wordId } });
    for (const s of sentences) {
      await enqueue({ table: 'vocab_sentences', action: 'delete', data: { id: s.id } });
    }
  };

  if (isOnline && !vocabCloudUnavailable) {
    const { error } = await supabase.from('vocab_words').delete().eq('id', wordId);
    if (error) {
      noteCloudError(error);
      if (!isMissingTableError(error)) await enqueueDelete();
    }
  } else {
    await enqueueDelete();
  }
}

/* -------------------------------------------------------------------------- */
/*  Sentences                                                                  */
/* -------------------------------------------------------------------------- */

export async function saveVocabSentences(
  sentences: VocabSentence[],
  isOnline: boolean
): Promise<void> {
  if (sentences.length === 0) return;
  await vocabDb.vocab_sentences.bulkPut(sentences);
  const payloads = sentences.map((s) =>
    toCloudVocabSentence(s as unknown as Record<string, unknown>)
  );
  if (isOnline && !vocabCloudUnavailable) {
    const { error } = await supabase
      .from('vocab_sentences')
      .upsert(payloads, { onConflict: 'id' });
    if (error) {
      noteCloudError(error);
      if (!isMissingTableError(error)) {
        for (const p of payloads) {
          await enqueue({ table: 'vocab_sentences', action: 'update', data: p });
        }
      }
    }
  } else {
    for (const p of payloads) {
      await enqueue({ table: 'vocab_sentences', action: 'update', data: p });
    }
  }
}

export async function listVocabSentences(
  userId: string,
  isOnline: boolean
): Promise<VocabSentence[]> {
  await flushVocabSyncQueue(isOnline);
  if (isOnline && !vocabCloudUnavailable) {
    const { data, error } = await supabase
      .from('vocab_sentences')
      .select(VOCAB_SENTENCE_CLOUD_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) {
      noteCloudError(error);
    } else if (data) {
      const mapped = data as VocabSentence[];
      await vocabDb.vocab_sentences.bulkPut(mapped);
      return mapped;
    }
  }
  return vocabDb.vocab_sentences.where('user_id').equals(userId).toArray();
}

export async function listSentencesForWord(wordId: string): Promise<VocabSentence[]> {
  return vocabDb.vocab_sentences.where('word_id').equals(wordId).toArray();
}

export async function deleteVocabSentence(sentenceId: string, isOnline: boolean): Promise<void> {
  await vocabDb.vocab_sentences.delete(sentenceId);
  const data = { id: sentenceId };
  if (isOnline && !vocabCloudUnavailable) {
    const { error } = await supabase.from('vocab_sentences').delete().eq('id', sentenceId);
    if (error) {
      noteCloudError(error);
      if (!isMissingTableError(error)) {
        await enqueue({ table: 'vocab_sentences', action: 'delete', data });
      }
    }
  } else {
    await enqueue({ table: 'vocab_sentences', action: 'delete', data });
  }
}

export function localTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Frases vencidas: nunca revisadas (sem snapshot) ou next_review <= hoje. */
export async function dueVocabSentences(userId: string): Promise<VocabSentence[]> {
  const today = localTodayISO();
  const rows = await vocabDb.vocab_sentences.where('user_id').equals(userId).toArray();
  return rows
    .filter((s) => s.next_review == null || s.next_review <= today)
    .sort((a, b) => String(a.next_review ?? '').localeCompare(String(b.next_review ?? '')));
}

/* -------------------------------------------------------------------------- */
/*  Dicionário (Free Dictionary API) + tradução PT-BR (Gemini)                 */
/* -------------------------------------------------------------------------- */

export interface DictionaryEntry {
  phonetic: string | null;
  audioUrl: string | null;
  pos: string | null;
  definitionEn: string | null;
  meanings: VocabWordMeaning[];
}

export async function fetchDictionaryEntry(lemma: string): Promise<DictionaryEntry | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lemma.trim().toLowerCase())}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!Array.isArray(json) || json.length === 0) return null;

    let phonetic: string | null = null;
    let audioUrl: string | null = null;
    const meanings: VocabWordMeaning[] = [];

    for (const entry of json) {
      if (!phonetic && typeof entry?.phonetic === 'string' && entry.phonetic) {
        phonetic = entry.phonetic;
      }
      const phonetics = Array.isArray(entry?.phonetics) ? entry.phonetics : [];
      for (const p of phonetics) {
        if (!phonetic && typeof p?.text === 'string' && p.text) phonetic = p.text;
        if (!audioUrl && typeof p?.audio === 'string' && p.audio) audioUrl = p.audio;
      }
      const ms = Array.isArray(entry?.meanings) ? entry.meanings : [];
      for (const m of ms) {
        const defs = Array.isArray(m?.definitions) ? m.definitions : [];
        for (const d of defs.slice(0, 2)) {
          if (typeof d?.definition === 'string' && d.definition) {
            meanings.push({
              pos: typeof m?.partOfSpeech === 'string' ? m.partOfSpeech : '',
              definition: d.definition,
              example: typeof d?.example === 'string' ? d.example : undefined,
            });
          }
        }
      }
    }

    const first = meanings[0];
    return {
      phonetic,
      audioUrl,
      pos: first?.pos || null,
      definitionEn: first?.definition || null,
      meanings: meanings.slice(0, 8),
    };
  } catch {
    return null;
  }
}

export async function translateToPtBr(text: string): Promise<string> {
  try {
    return await geminiService.translateText(text, 'pt');
  } catch (e) {
    console.warn('[vocab] Falha na tradução PT-BR:', e);
    return '';
  }
}

/** Cria uma palavra nova já enriquecida (dicionário + tradução). */
export async function addVocabWord(
  userId: string,
  lemma: string,
  isOnline: boolean
): Promise<VocabWord> {
  const normalized = lemma.trim().toLowerCase();
  const existing = await getVocabWordByLemma(userId, normalized);
  if (existing) return existing;

  const dict = await fetchDictionaryEntry(normalized);
  let translation = '';
  if (dict?.definitionEn) {
    translation = await translateToPtBr(dict.definitionEn);
  }
  if (!translation) {
    translation = await translateToPtBr(normalized);
  }

  const now = new Date().toISOString();
  const word: VocabWord = {
    id: crypto.randomUUID(),
    user_id: userId,
    lemma: normalized,
    pos: dict?.pos ?? null,
    definition_en: dict?.definitionEn ?? null,
    meanings: dict?.meanings ?? [],
    translation_pt: translation || null,
    phonetic: dict?.phonetic ?? null,
    audio_url: dict?.audioUrl ?? null,
    status: 'learning',
    fsrs_snapshot: null,
    correct_streak: 0,
    created_at: now,
    updated_at: now,
  };
  await saveVocabWord(word, isOnline);
  return word;
}

/* -------------------------------------------------------------------------- */
/*  Áudio: Free Dictionary mp3 (com cache) + Web Speech API (TTS)              */
/* -------------------------------------------------------------------------- */

export interface SpeakEnglishOptions {
  accent?: 'us' | 'uk';
  rate?: number;
}

function pickEnglishVoice(accent: SpeakEnglishOptions['accent'] = 'us'): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  if (accent === 'uk') {
    return (
      voices.find((v) => /en-gb|english \(uk\)|british/i.test(`${v.lang} ${v.name}`)) ||
      voices.find((v) => /en-gb/i.test(v.lang))
    );
  }
  return (
    voices.find((v) => /google us english/i.test(v.name)) ||
    voices.find((v) => v.lang === 'en-US') ||
    voices.find((v) => v.lang?.startsWith('en'))
  );
}

/** TTS via Web Speech API — cobre palavras e frases sem áudio do dicionário. */
export function speakEnglish(text: string, options: SpeakEnglishOptions = {}) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const accent = options.accent ?? 'us';
  utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
  utterance.rate = options.rate ?? 0.92;
  const voice = pickEnglishVoice(accent);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

/** Toca o mp3 do dicionário quando existe; senão, cai para TTS. */
export async function playVocabAudio(text: string, audioUrl: string | null): Promise<void> {
  if (audioUrl) {
    try {
      const objectUrl = await getCachedAudioUrl(audioUrl);
      const audio = new Audio(objectUrl);
      await audio.play();
      return;
    } catch {
      // cai para TTS
    }
  }
  speakEnglish(text);
}

/** Resolve um audio_url remoto para object URL com blob cacheado no Dexie. */
async function getCachedAudioUrl(remoteUrl: string): Promise<string> {
  const cached = await vocabDb.vocab_audio_cache.get(remoteUrl);
  if (cached) {
    return URL.createObjectURL(cached.blob);
  }
  const res = await fetch(remoteUrl);
  if (!res.ok) throw new Error(`audio fetch ${res.status}`);
  const blob = await res.blob();
  await vocabDb.vocab_audio_cache.put({
    url: remoteUrl,
    blob,
    fetched_at: new Date().toISOString(),
  });
  return URL.createObjectURL(blob);
}

/* -------------------------------------------------------------------------- */
/*  Autocomplete (Datamuse, CORS aberto)                                       */
/* -------------------------------------------------------------------------- */

export async function suggestEnglishWords(prefix: string): Promise<string[]> {
  const q = prefix.trim().toLowerCase();
  if (q.length < 2) return [];
  try {
    const res = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(q)}&max=8`);
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json)) return [];
    return json
      .map((x) => (typeof x?.word === 'string' ? x.word : ''))
      .filter((w): w is string => !!w && !w.includes(' '));
  } catch {
    return [];
  }
}
