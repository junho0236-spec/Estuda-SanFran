import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { clampUtf16, MAX_CHAT_MESSAGE_CHARS } from './chatContentLimits';

interface SafeChatMarkdownProps {
  content: string;
}

/**
 * Markdown de mensagens de chat: limite de tamanho + sanitização HTML (rehype-sanitize, estilo GitHub).
 */
export const SafeChatMarkdown: React.FC<SafeChatMarkdownProps> = ({ content }) => {
  const safe = clampUtf16(content ?? '', MAX_CHAT_MESSAGE_CHARS);
  return (
    <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
      {safe}
    </Markdown>
  );
};

export default SafeChatMarkdown;
