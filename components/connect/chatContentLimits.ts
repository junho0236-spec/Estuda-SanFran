import type { ChatMessage } from '../../types';

/** Alinhado com UX do compositor; ajuste se o Supabase Storage tiver outro teto. */
export const MAX_CHAT_MESSAGE_CHARS = 8000;

export const MAX_LINK_PREVIEW_TITLE = 200;
export const MAX_LINK_PREVIEW_DESCRIPTION = 600;
export const MAX_LINK_URL_CHARS = 2048;

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const MAX_ATTACHMENT_NAME_LENGTH = 200;

export const MAX_REPLY_SNIPPET_CHARS = 500;

export function clampUtf16(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

export function stripControlChars(text: string): string {
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}

/** http(s) apenas, sem credenciais em userinfo. */
export function sanitizeChatHttpUrl(url: string): string | null {
  const t = url.trim().slice(0, MAX_LINK_URL_CHARS);
  try {
    const u = new URL(t);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.username || u.password) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Só https para carregar imagens (evita misto e esquemas perigosos em img[src]). */
export function sanitizeHttpsUrlForImg(url: string): string | undefined {
  const t = url.trim().slice(0, MAX_LINK_URL_CHARS);
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') return undefined;
    if (u.username || u.password) return undefined;
    return u.href;
  } catch {
    return undefined;
  }
}

export function sanitizeAttachmentDisplayName(name: string): string {
  const stripped = stripControlChars(name).trim();
  return clampUtf16(stripped, MAX_ATTACHMENT_NAME_LENGTH) || 'ficheiro';
}

export function attachmentTooLarge(file: File): boolean {
  return file.size > MAX_ATTACHMENT_BYTES;
}

export function formatMaxMegabytes(): string {
  return String(Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024)));
}

/**
 * Normaliza metadados de preview vindos da IA ou armazenados — sempre com URL canónica segura.
 */
export function normalizeLinkPreviewForStorage(
  raw: Record<string, unknown>,
  userFacingUrl: string
): ChatMessage['link_preview'] | null {
  const url = sanitizeChatHttpUrl(userFacingUrl);
  if (!url) return null;

  const titleRaw = typeof raw.title === 'string' ? stripControlChars(raw.title) : '';
  const title = clampUtf16(titleRaw.trim(), MAX_LINK_PREVIEW_TITLE);
  const descRaw = typeof raw.description === 'string' ? stripControlChars(raw.description) : '';
  const description = clampUtf16(descRaw, MAX_LINK_PREVIEW_DESCRIPTION);

  let image: string | undefined;
  if (typeof raw.image === 'string') {
    const im = sanitizeHttpsUrlForImg(raw.image);
    if (im) image = im;
  }

  const out: ChatMessage['link_preview'] = {
    url,
    title: title || 'Link',
    description,
  };
  if (image) out.image = image;
  return out;
}

export function applyYoutubePreviewImage(
  preview: ChatMessage['link_preview'] | null,
  pageUrl: string
): ChatMessage['link_preview'] | null {
  if (!preview) return null;
  if (!pageUrl.includes('youtube.com') && !pageUrl.includes('youtu.be')) return preview;
  const videoId = pageUrl.includes('v=')
    ? pageUrl.split('v=')[1]?.split('&')[0]
    : pageUrl.split('/').pop();
  if (!videoId || !/^[a-zA-Z0-9_-]{6,32}$/.test(videoId)) return preview;
  return {
    ...preview,
    image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
  };
}

export function sanitizeLinkPreviewForRpc(
  lp: NonNullable<ChatMessage['link_preview']>
): ChatMessage['link_preview'] | null {
  return normalizeLinkPreviewForStorage(
    {
      title: lp.title,
      description: lp.description,
      image: lp.image,
    },
    lp.url
  );
}

/** Revalida dados já gravados (defesa em profundidade na UI). */
export function sanitizeStoredLinkPreview(
  lp: ChatMessage['link_preview'] | null | undefined
): ChatMessage['link_preview'] | null {
  if (!lp?.url) return null;
  return normalizeLinkPreviewForStorage(
    {
      title: lp.title,
      description: lp.description,
      image: lp.image,
    },
    lp.url
  );
}

export function safeAttachmentUrlForMedia(url: string | undefined | null): string | null {
  if (!url) return null;
  const https = sanitizeHttpsUrlForImg(url);
  if (https) return https;
  return sanitizeChatHttpUrl(url);
}
