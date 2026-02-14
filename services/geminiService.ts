
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Tenta capturar a chave de API de diversas fontes comuns em builds de frontend (Vite, Webpack, Vercel).
 */
export const getSafeApiKey = (): string | null => {
  try {
    // 1. Tenta o padrão exigido (process.env)
    const processKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : null;
    if (processKey && processKey !== "undefined" && processKey !== "") return processKey;

    // 2. Tenta o padrão do Vite (import.meta.env) caso o build esteja mascarando process.env
    // @ts-ignore
    const viteKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_KEY : null;
    if (viteKey && viteKey !== "undefined" && viteKey !== "") return viteKey;

    // 3. Verifica se a chave foi injetada globalmente no index.html
    // @ts-ignore
    const globalKey = window.__API_KEY__;
    if (globalKey && globalKey !== "") return globalKey;

  } catch (e) {
    // Falha silenciosa se os objetos de ambiente não existirem
  }
  return null;
};

/**
 * Gera flashcards utilizando o modelo Gemini.
 */
export const generateFlashcards = async (text: string, subjectName: string) => {
  const apiKey = getSafeApiKey();
  
  if (!apiKey) {
    throw new Error("DILIGÊNCIA NECESSÁRIA: A variável 'API_KEY' não está visível para o navegador. Na Vercel, certifique-se de que a variável foi adicionada e o projeto foi reconstruído.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Você é um tutor da SanFran (Academia Jurídica FDUSP). Sua tarefa é converter o texto jurídico abaixo em uma lista de Flashcards para Anki.
      
      DISCIPLINA: ${subjectName}
      TEXTO PARA PROCESSAR: ${text}
      
      REGRAS:
      - Responda APENAS com o JSON.
      - Foco em prazos, conceitos latinos e doutrina clássica.
      - Crie perguntas instigantes na frente (front) e respostas fundamentadas no verso (back).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: 'Pergunta (Frente).' },
              back: { type: Type.STRING, description: 'Resposta (Verso).' }
            },
            required: ["front", "back"]
          }
        }
      }
    });

    if (!response.text) throw new Error("A IA não retornou conteúdo.");
    return JSON.parse(response.text.trim());
  } catch (err: any) {
    console.error("Erro Gemini:", err);
    throw new Error("Erro no processamento da IA. Verifique se sua chave tem permissão para o modelo Gemini 1.5 Flash.");
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  const apiKey = getSafeApiKey();
  if (!apiKey) return "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano";

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma frase de motivação curta para um estudante de Direito da SanFran que estuda: ${subjects.join(', ')}. Estilo erudito e clássico.`,
    });
    return response.text;
  } catch (e) {
    return "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano";
  }
};
