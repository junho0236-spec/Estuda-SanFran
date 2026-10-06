/**
 * Cliente mínimo do Ollama local (geração de texto do Vocab EN).
 * Só funciona quando o app roda na mesma máquina do Ollama; em qualquer
 * outro cenário (deploy, mobile, Ollama desligado) `shouldUseOllama()`
 * retorna false e os chamadores seguem direto para o Gemini.
 */

export const OLLAMA_STORAGE_KEY = 'sanfran_use_ollama';

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen2.5:3b';
const HEALTH_TIMEOUT_MS = 1500;
const DEFAULT_GENERATE_TIMEOUT_MS = 90000;

const configuredUrl = (import.meta.env.VITE_OLLAMA_URL || '').trim();

export const OLLAMA_URL = (configuredUrl || DEFAULT_OLLAMA_URL).replace(/\/+$/, '');
export const OLLAMA_MODEL = (import.meta.env.VITE_OLLAMA_MODEL || '').trim() || DEFAULT_OLLAMA_MODEL;

export function getUseOllama(): boolean {
  try {
    const raw = localStorage.getItem(OLLAMA_STORAGE_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function setUseOllama(value: boolean) {
  try {
    localStorage.setItem(OLLAMA_STORAGE_KEY, String(value));
  } catch {
    /* storage indisponível */
  }
}

/**
 * Sem VITE_OLLAMA_URL explícito, só sondamos o localhost quando a própria
 * página também é local — evita requisições (e o prompt de "acesso à rede
 * local" do Chrome) para usuários do site publicado.
 */
function isLocalPage(): boolean {
  try {
    const host = window.location.hostname;
    return (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '[::1]' ||
      host === '::1' ||
      /^127\./.test(host)
    );
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function modelMatches(name: string, wanted: string): boolean {
  const withTag = (n: string) => (n.includes(':') ? n : `${n}:latest`);
  return withTag(name) === withTag(wanted);
}

let availabilityPromise: Promise<boolean> | null = null;

async function probeOllama(): Promise<boolean> {
  if (!configuredUrl && !isLocalPage()) return false;
  try {
    const res = await fetchWithTimeout(`${OLLAMA_URL}/api/tags`, { method: 'GET' }, HEALTH_TIMEOUT_MS);
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    const models: unknown = data?.models;
    if (!Array.isArray(models)) return true;
    const found = models.some(
      (m) => typeof m?.name === 'string' && modelMatches(m.name, OLLAMA_MODEL)
    );
    if (!found) console.info(`[ollama] modelo ${OLLAMA_MODEL} não encontrado; usando Gemini.`);
    return found;
  } catch {
    return false;
  }
}

/** Health check (GET /api/tags, ~1.5s). Resultado cacheado durante a sessão. */
export function isOllamaAvailable(): Promise<boolean> {
  if (!availabilityPromise) availabilityPromise = probeOllama();
  return availabilityPromise;
}

/** Flag ligada + Ollama respondendo com o modelo configurado. */
export async function shouldUseOllama(): Promise<boolean> {
  if (!getUseOllama()) return false;
  return isOllamaAvailable();
}

export interface OllamaGenerateOptions {
  jsonMode?: boolean;
  timeoutMs?: number;
}

/**
 * POST /api/generate (stream: false). Lança erro em falha de rede, timeout,
 * status HTTP != 2xx ou resposta vazia — o chamador deve cair no Gemini.
 */
export async function ollamaGenerate(prompt: string, options: OllamaGenerateOptions = {}): Promise<string> {
  const { jsonMode = false, timeoutMs = DEFAULT_GENERATE_TIMEOUT_MS } = options;
  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${OLLAMA_URL}/api/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          ...(jsonMode ? { format: 'json' } : {}),
          stream: false,
          options: { num_ctx: 4096 },
        }),
      },
      timeoutMs
    );
  } catch (e) {
    // Ollama caiu no meio da sessão: não insistir nas próximas chamadas.
    if (!(e instanceof DOMException && e.name === 'AbortError')) {
      availabilityPromise = Promise.resolve(false);
    }
    throw e;
  }
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  const text = typeof data?.response === 'string' ? data.response.trim() : '';
  if (!text) throw new Error('Ollama retornou resposta vazia');
  return text;
}
