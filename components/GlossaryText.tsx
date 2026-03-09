import React from 'react';

const COMMON_TERMS = [
  'habeas corpus', 'reformatio in pejus', 'vacatio legis', 'pacta sunt servanda',
  'amicus curiae', 'erga omnes', 'in dubio pro reo', 'jus cogens', 'mens rea',
  'actus reus', 'stare decisis', 'subpoena', 'affidavit', 'pro bono',
  'ex post facto', 'de jure', 'de facto', 'inter alia', 'mutatis mutandis',
  'prima facie', 'quid pro quo', 'ultra vires', 'caveat emptor', 'habeas data',
  'mandado de segurança', 'contraditório', 'ampla defesa', 'devido processo legal',
  'coisa julgada', 'lide', 'pretensão', 'prescrição', 'decadência', 'ônus da prova',
  'revelia', 'agravo de instrumento', 'recurso especial', 'recurso extraordinário'
];

interface GlossaryTextProps {
  text: string;
  onTermClick: (term: string, position: { x: number; y: number }) => void;
}

export const GlossaryText: React.FC<GlossaryTextProps> = ({ text, onTermClick }) => {
  if (!text) return null;

  // Create a regex that matches any of the terms (case insensitive)
  // We use word boundaries to avoid matching parts of words
  // Sort terms by length descending to match longer phrases first (e.g. "habeas corpus" before "habeas")
  const sortedTerms = [...COMMON_TERMS].sort((a, b) => b.length - a.length);
  const regex = new RegExp(`\\b(${sortedTerms.join('|')})\\b`, 'gi');

  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = sortedTerms.some(term => term.toLowerCase() === part.toLowerCase());
        
        if (isMatch) {
          return (
            <span
              key={i}
              className="cursor-help border-b border-dotted border-indigo-400 hover:bg-indigo-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onTermClick(part, { x: e.clientX, y: e.clientY });
              }}
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
};
