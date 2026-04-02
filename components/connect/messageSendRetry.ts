/** Tentativas automáticas antes de marcar falha (envio mensagem / ficheiro). */
export const CHAT_SEND_MAX_ATTEMPTS = 3;
export const CHAT_SEND_RETRY_BASE_MS = 700;

export async function withChatSendRetries<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < CHAT_SEND_MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (attempt < CHAT_SEND_MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, CHAT_SEND_RETRY_BASE_MS * Math.pow(2, attempt)));
      }
    }
  }
  throw last;
}
