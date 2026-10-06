import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_MODEL } from './geminiService';
import {
  VocabWord,
  VocabSentence,
  listVocabSentences,
  saveVocabSentences,
} from './vocabService';
import { VOCAB_SEED_WORDS } from './vocabSeedWords';
import { ollamaGenerate, shouldUseOllama } from './ollamaService';

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

/**
 * Modelos fracos às vezes deixam a palavra alvo em inglês na tradução
 * ("teve que rebuke"). Ignora cognatos (tradução da palavra contém o lemma).
 */
function translationKeepsEnglishTarget(
  textPt: string,
  targetLemma: string,
  targetTranslationPt: string | null
): boolean {
  const lemma = targetLemma.toLowerCase();
  if (lemma.length < 3) return false;
  if (targetTranslationPt && tokenize(targetTranslationPt).some((t) => t.includes(lemma))) return false;
  return tokenize(textPt).some((tok) => tok === lemma || naiveLemma(tok) === lemma);
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
  blockedEnglish: string[],
  outputShape: 'array' | 'object' = 'array',
  targetMeaningPt?: string | null
): string {
  const vocabSample = knownList.slice(0, 600).join(', ');
  const blockedSample =
    blockedEnglish.length > 0
      ? `\n- Never return any of these sentences (or close rephrases): ${blockedEnglish
          .slice(0, 40)
          .join(' | ')}`
      : '';
  const meaningRule = targetMeaningPt?.trim()
    ? `\n- In Brazilian Portuguese, "${targetLemma}" means "${targetMeaningPt.trim()}". In each "pt" translation, translate "${targetLemma}" with this meaning (conjugated/inflected as needed).`
    : '';
  return `You are a language-learning sentence generator. Write ${count} short English sentences (8-14 words each) that teach the word "${targetLemma}" in context, in the i+1 style: every other word in each sentence MUST come only from this allowed vocabulary list (plus inflections of it):

${vocabSample}

Rules:
- Each sentence must contain the word "${targetLemma}" (any inflection).
- Do NOT use any other word outside the allowed list. No proper nouns.
- Sentences must be natural, varied in meaning, and help infer the word's meaning.
- Keep wording simple and very common, avoiding unnatural phrasing.
- For each sentence, also give a natural Brazilian Portuguese translation. Translate every word; never leave English words in the "pt" field.${meaningRule}
- Avoid uncommon names, legal citations, or slang.
${blockedSample}
- ${
    outputShape === 'object'
      ? 'Respond ONLY with a JSON object like {"sentences": [{"en": "...", "pt": "..."}]}.'
      : 'Respond ONLY with a JSON array like [{"en": "...", "pt": "..."}].'
  }`;
}

function extractJsonArray(text: string): GeneratedSentence[] {
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  try {
    let parsed: unknown;
    if (start !== -1 && end !== -1) {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } else {
      // Ollama com format:'json' às vezes devolve um único objeto {en, pt}.
      const single = JSON.parse(cleaned);
      parsed = single && typeof single === 'object' ? [single] : [];
    }
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

const OLLAMA_GENERATION_ATTEMPTS = 4;

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
  const buildFor = (requestedCount: number, outputShape: 'array' | 'object' = 'array') =>
    buildPrompt(word.lemma, [...knownLemmas], requestedCount, blocked, outputShape, word.translation_pt);

  const runGeminiGeneration = async (requestedCount: number): Promise<GeneratedSentence[]> => {
    const prompt = buildFor(requestedCount);
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

  /** Retorna [] em qualquer falha (rede, timeout, JSON inválido) para cair no Gemini. */
  const runOllamaGeneration = async (requestedCount: number): Promise<GeneratedSentence[]> => {
    try {
      const text = await ollamaGenerate(buildFor(requestedCount, 'object'), {
        jsonMode: true,
      });
      return extractJsonArray(text);
    } catch (e) {
      console.debug('[vocab] Ollama falhou, usando Gemini:', e);
      return [];
    }
  };

  const existing = await listVocabSentences(userId, isOnline);
  const existingForWord = new Set(
    existing.filter((s) => s.word_id === word.id).map((s) => s.text_en.toLowerCase())
  );
  for (const b of blocked) existingForWord.add(b);

  const now = new Date().toISOString();
  const created: VocabSentence[] = [];
  const acceptCandidates = (candidates: GeneratedSentence[]) => {
    for (const c of candidates) {
      if (created.length >= count) break;
      const key = c.en.toLowerCase();
      if (existingForWord.has(key)) continue;
      const check = validateSentence(c.en, word.lemma, knownLemmas);
      if (!check.valid) {
        console.debug('[vocab] frase rejeitada pela validação i+1:', c.en, check.unknownTokens);
        continue;
      }
      if (translationKeepsEnglishTarget(c.pt || '', word.lemma, word.translation_pt)) {
        console.debug('[vocab] frase rejeitada: tradução manteve a palavra em inglês:', c.pt);
        continue;
      }
      existingForWord.add(key);
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
    }
  };

  // Ollama (local, gratuito, mais fraco): mais tentativas quando a validação
  // rejeita candidatas. Falha/resultado vazio encerra a fase local.
  if (await shouldUseOllama()) {
    for (let attempt = 0; attempt < OLLAMA_GENERATION_ATTEMPTS && created.length < count; attempt++) {
      const candidates = await runOllamaGeneration(Math.max(count, 4));
      if (candidates.length === 0) break;
      acceptCandidates(candidates);
    }
  }

  // Fallback Gemini (fluxo original: até 2 chamadas) se o Ollama não gerou nada válido.
  if (created.length === 0) {
    for (const requested of [Math.max(count, 4), Math.max(count, 3)]) {
      if (created.length >= count) break;
      acceptCandidates(await runGeminiGeneration(requested));
    }
  }

  if (created.length > 0) {
    await saveVocabSentences(created, isOnline);
  }
  return created;
}
