// Compat layer: replaces the real @google/genai module (via the
// '@google/genai' alias in vite.config.ts + tsconfig paths) with an
// OpenRouter-backed implementation that keeps the same public API.
// The app keeps calling `new GoogleGenAI(...)` and
// `ai.models.generateContent(...)` exactly as before; requests go to
// OpenRouter's OpenAI-compatible /chat/completions endpoint instead of
// Google's generativelanguage host.
//
// Authentication: set GEMINI_API_KEY (or API_KEY / VITE_* variants) in
// .env.local to an OpenRouter key (sk-or-...). It flows through the same
// vite `define` block as before — no env plumbing changes were needed.
// Free models (…:free) work with a zero-balance OpenRouter account.

// Enums usados pelos schemas do app (mesmos valores do @google/genai).
export enum Type {
  TYPE_UNSPECIFIED = 'TYPE_UNSPECIFIED',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
  NULL = 'NULL',
}

export enum ThinkingLevel {
  THINKING_LEVEL_UNSPECIFIED = 'THINKING_LEVEL_UNSPECIFIED',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  MINIMAL = 'MINIMAL',
}

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Modelo usado quando o código pede um modelo "gemini-*" (que não existe
// no OpenRouter). Nemotron 3 Super é gratuito e multimodal.
export const OPENROUTER_MODEL =
  'nvidia/nemotron-3-super-120b-a12b:free';

interface ShimPart {
  text?: string;
  inlineData?: { data: string; mimeType: string };
}

interface ShimContent {
  role?: string;
  parts?: ShimPart[];
}

interface GenerateContentParams {
  model: string;
  contents: string | ShimContent | ShimContent[];
  config?: Record<string, any>;
}

function resolveModel(model: string): string {
  // Modelos OpenRouter têm o formato "provedor/nome[:variante]".
  return model.includes('/') ? model : OPENROUTER_MODEL;
}

function toOpenAiMessages(
  contents: string | ShimContent | ShimContent[],
  config?: Record<string, any>
): any[] {
  const messages: any[] = [];
  if (config?.systemInstruction) {
    const sys =
      typeof config.systemInstruction === 'string'
        ? config.systemInstruction
        : config.systemInstruction.parts?.map((p: any) => p.text).join('');
    if (sys) messages.push({ role: 'system', content: sys });
  }

  const list: ShimContent[] =
    typeof contents === 'string'
      ? [{ role: 'user', parts: [{ text: contents }] }]
      : Array.isArray(contents)
        ? contents
        : [contents];

  for (const c of list) {
    const role = c.role === 'model' ? 'assistant' : c.role || 'user';
    const parts = c.parts ?? [];
    const textOnly = parts.every((p) => p.text !== undefined || !p.inlineData);
    if (textOnly && parts.every((p) => p.inlineData === undefined)) {
      messages.push({
        role,
        content: parts.map((p) => p.text ?? '').join(''),
      });
      continue;
    }
    // Multimodal: mapeia text/inlineData para o formato de content parts
    // da API OpenAI (image_url com data URL).
    const contentParts: any[] = parts.map((p) => {
      if (p.text !== undefined) return { type: 'text', text: p.text };
      if (p.inlineData)
        return {
          type: 'image_url',
          image_url: {
            url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`,
          },
        };
      return { type: 'text', text: '' };
    });
    messages.push({ role, content: contentParts });
  }
  return messages;
}

function jsonSchemaToOpenAi(schema: any): any {
  // Converte o formato Gemini (types em maiúsculo) para JSON Schema comum.
  if (!schema || typeof schema !== 'object') return schema;
  const out: any = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'type' && typeof v === 'string') out.type = v.toLowerCase();
    else if (k === 'items') out.items = jsonSchemaToOpenAi(v);
    else if (k === 'properties') {
      out.properties = {};
      for (const [pk, pv] of Object.entries(v as any))
        out.properties[pk] = jsonSchemaToOpenAi(pv);
    } else out[k] = v;
  }
  return out;
}

function buildBody(params: GenerateContentParams, stream: boolean) {
  const body: any = {
    model: resolveModel(params.model),
    messages: toOpenAiMessages(params.contents, params.config),
    stream,
  };
  const level = params.config?.thinkingConfig?.thinkingLevel;
  if (level && level !== 'THINKING_LEVEL_UNSPECIFIED') {
    body.reasoning = {
      effort: level === 'MINIMAL' ? 'low' : level.toLowerCase(),
    };
  }
  if (params.config?.responseSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'response',
        strict: true,
        schema: jsonSchemaToOpenAi(params.config.responseSchema),
      },
    };
  } else if (params.config?.responseMimeType === 'application/json') {
    body.response_format = { type: 'json_object' };
  }
  return body;
}

async function callOpenRouter(body: any, apiKey: string): Promise<any> {
  const res = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Alguns provedores gratuitos rejeitam response_format estrito:
    // tenta novamente sem ele, pedindo JSON pelo prompt.
    if (res.status === 400 && body.response_format) {
      delete body.response_format;
      body.messages = [
        {
          role: 'system',
          content:
            'Responda APENAS com JSON válido, sem markdown nem texto extra.',
        },
        ...body.messages,
      ];
      return callOpenRouter(body, apiKey);
    }
    const text = await res.text();
    const err: any = new Error(`OpenRouter error ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function toResponse(json: any) {
  const text = json.choices?.[0]?.message?.content ?? '';
  return {
    text,
    candidates: [
      { content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' },
    ],
    raw: json,
  };
}

class OpenRouterModels {
  constructor(private apiKey: string) {}

  async generateContent(params: GenerateContentParams) {
    const json = await callOpenRouter(
      buildBody(params, false),
      this.apiKey
    );
    return toResponse(json);
  }

  async *generateContentStream(params: GenerateContentParams) {
    const res = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildBody(params, true)),
    });
    if (!res.ok) {
      const text = await res.text();
      const err: any = new Error(`OpenRouter error ${res.status}: ${text}`);
      err.status = res.status;
      throw err;
    }
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content ?? '';
          if (delta) yield { text: delta };
        } catch {
          /* ignora linhas parciais/keep-alive */
        }
      }
    }
  }
}

class OpenRouterChat {
  private messages: any[] = [];
  constructor(private apiKey: string, private model: string) {}

  async sendMessage({ message }: { message: string }) {
    this.messages.push({ role: 'user', content: message });
    const json = await callOpenRouter(
      { model: resolveModel(this.model), messages: this.messages },
      this.apiKey
    );
    const response = toResponse(json);
    this.messages.push({ role: 'assistant', content: response.text });
    return response;
  }
}

class OpenRouterChats {
  constructor(private apiKey: string) {}
  create({ model }: { model: string }) {
    return new OpenRouterChat(this.apiKey, model);
  }
}

export class GoogleGenAI {
  models: OpenRouterModels;
  chats: OpenRouterChats;

  constructor({ apiKey }: { apiKey?: string }) {
    const key = apiKey || '';
    this.models = new OpenRouterModels(key);
    this.chats = new OpenRouterChats(key);
  }
}
