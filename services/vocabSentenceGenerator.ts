import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_MODEL } from './geminiService';
import {
  VocabWord,
  VocabSentence,
  listVocabSentences,
  saveVocabSentences,
} from './vocabService';
import { VOCAB_SEED_WORDS } from './vocabSeedWords';

/**
 * Gerador de frases i+1 (compreensível + 1 item novo), estilo Migaku.
 * Recebe a palavra alvo e o vocabulário 'known'/'learning' do usuário
 * (opcionalmente combinado com a seed das ~500 palavras mais frequentes),
 * pede 3–5 frases ao Gemini com tradução PT-BR, valida e persiste.
 */

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const VOCAB_SEED_STORAGE_KEY = 'sanfran_vocab_use_seed';

export function getUseSeed(): boolean {
  try {
    const raw = localStorage.getItem(VOCAB_SEED_STORAGE_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function setUseSeed(value: boolean) {
  try {
    localStorage.setItem(VOCAB_SEED_STORAGE_KEY, String(value));
  } catch {
    /* storage indisponível */
  }
}

/** Lemmas que o gerador pode usar livremente: known/learning do usuário + seed. */
export async function getKnownLemmas(
  words: VocabWord[],
  includeSeed: boolean
): Promise<Set<string>> {
  const known = new Set<string>();
  for (const w of words) {
    if (w.status === 'known' || w.status === 'learning') known.add(w.lemma);
  }
  if (includeSeed) {
    for (const w of VOCAB_SEED_WORDS) known.add(w);
  }
  return known;
}

/* ------------------------- validação i+1 (local) -------------------------- */

const IRREGULAR_PLURALS: Record<string, string> = {
  children: 'child', men: 'man', women: 'woman', people: 'person',
  feet: 'foot', teeth: 'tooth', mice: 'mouse', geese: 'goose',
};

const CONTRACTIONS: Record<string, string> = {
  "n't": 'not', "'s": 'be', "'re": 'be', "'ve": 'have', "'ll": 'will',
  "'d": 'would', "'m": 'be',
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Lematização aproximada para checar se a frase respeita o vocabulário. */
function naiveLemma(token: string): string {
  let t = token.toLowerCase().replace(/^-+|-+$/g, '');
  for (const [suffix, base] of Object.entries(CONTRACTIONS)) {
    if (t.endsWith(suffix)) t = t.slice(0, t.length - suffix.length);
  }
  if (IRREGULAR_PLURALS[t]) return IRREGULAR_PLURALS[t];
  if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y';
  if (t.length > 5 && t.endsWith('ing')) return t.slice(0, -3).replace(/([a-z])\1$/, '$1');
  if (t.length > 4 && t.endsWith('ed')) return t.slice(0, -2).replace(/([a-z])\1$/, '$1');
  if (t.length > 3 && t.endsWith('es')) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith('s')) return t.slice(0, -1);
  return t;
}

interface ValidationResult {
  valid: boolean;
  unknownTokens: string[];
  containsTarget: boolean;
}

function validateSentence(
  textEn: string,
  targetLemma: string,
  knownLemmas: Set<string>
): ValidationResult {
  const tokens = tokenize(textEn);
  const unknownTokens: string[] = [];
  let containsTarget = false;
  for (const tok of tokens) {
    const lemma = naiveLemma(tok);
    if (lemma === targetLemma || tok === targetLemma) {
      containsTarget = true;
      continue;
    }
    if (knownLemmas.has(lemma) || knownLemmas.has(tok)) continue;
    // números e palavras de 1 letra (artigo 'a' já está na seed) não contam
    if (/^\d+$/.test(tok) || tok.length === 1) continue;
    unknownTokens.push(tok);
  }
  // tolerância: 1 token desconhecido por margem de lematização aproximada
  const valid = containsTarget && unknownTokens.length <= 1 && tokens.length >= 4;
  return { valid, unknownTokens, containsTarget };
}

/* ------------------------------ geração ----------------------------------- */

interface GeneratedSentence {
  en: string;
  pt: string;
}

function buildPrompt(
  targetLemma: string,
  knownList: string[],
  count: number,
  blockedEnglish: string[]
): string {
  const vocabSample = knownList.slice(0, 600).join(', ');
  const blockedSample =
    blockedEnglish.length > 0
      ? `\n- Never return any of these sentences (or close rephrases): ${blockedEnglish
          .slice(0, 40)
          .join(' | ')}`
      : '';
  return `You are a language-learning sentence generator. Write ${count} short English sentences (8-14 words each) that teach the word "${targetLemma}" in context, in the i+1 style: every other word in each sentence MUST come only from this allowed vocabulary list (plus inflections of it):

${vocabSample}

Rules:
- Each sentence must contain the word "${targetLemma}" (any inflection).
- Do NOT use any other word outside the allowed list. No proper nouns.
- Sentences must be natural, varied in meaning, and help infer the word's meaning.
- Keep wording simple and very common, avoiding unnatural phrasing.
- For each sentence, also give a natural Brazilian Portuguese translation.
- Avoid uncommon names, legal citations, or slang.
${blockedSample}
- Respond ONLY with a JSON array like [{"en": "...", "pt": "..."}].`;
}

function extractJsonArray(text: string): GeneratedSentence[] {
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) return [];
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => ({
        en: typeof x?.en === 'string' ? x.en.trim() : '',
        pt: typeof x?.pt === 'string' ? x.pt.trim() : '',
      }))
      .filter((x) => x.en.length > 0);
  } catch {
    return [];
  }
}

/**
 * Gera, valida e persiste frases i+1 para a palavra alvo.
 * Retorna as frases criadas (pode ser < requested se a validação filtrar).
 */
export async function generateSentencesForWord(
  userId: string,
  word: VocabWord,
  allWords: VocabWord[],
  isOnline: boolean,
  count = 4,
  options?: { blockedEnglish?: string[] }
): Promise<VocabSentence[]> {
  const knownLemmas = await getKnownLemmas(allWords, getUseSeed());
  const blocked = (options?.blockedEnglish ?? []).map((x) => x.trim().toLowerCase()).filter(Boolean);
  const runGeneration = async (requestedCount: number): Promise<GeneratedSentence[]> => {
    const prompt = buildPrompt(word.lemma, [...knownLemmas], requestedCount, blocked);
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              en: { type: Type.STRING },
              pt: { type: Type.STRING },
            },
          },
        },
      },
    });
    return extractJsonArray(response.text || '');
  };
  const existing = await listVocabSentences(userId, isOnline);
  const existingForWord = new Set(
    existing.filter((s) => s.word_id === word.id).map((s) => s.text_en.toLowerCase())
  );
  for (const b of blocked) existingForWord.add(b);

  const candidates = [
    ...(await runGeneration(Math.max(count, 4))),
    ...(await runGeneration(Math.max(count, 3))),
  ];

  const now = new Date().toISOString();
  const created: VocabSentence[] = [];
  for (const c of candidates) {
    if (existingForWord.has(c.en.toLowerCase())) continue;
    const check = validateSentence(c.en, word.lemma, knownLemmas);
    if (!check.valid) {
      console.debug('[vocab] frase rejeitada pela validação i+1:', c.en, check.unknownTokens);
      continue;
    }
    created.push({
      id: crypto.randomUUID(),
      user_id: userId,
      word_id: word.id,
      text_en: c.en,
      translation_pt: c.pt || null,
      audio_url: null,
      fsrs_snapshot: null,
      next_review: null,
      created_at: now,
      updated_at: now,
    });
    if (created.length >= count) break;
  }

  if (created.length > 0) {
    await saveVocabSentences(created, isOnline);
  }
  return created;
}
