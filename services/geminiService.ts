
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Recupera a chave de API de forma segura, tratando casos onde o objeto process 
 * pode não estar definido no ambiente de execução do navegador.
 */
export const getSafeApiKey = (): string | null => {
  try {
    // Tenta acessar via process.env (comum em builds Vercel/Vite/Esbuild)
    const key = typeof process !== 'undefined' && process.env ? process.env.API_KEY : null;
    if (key && key !== "undefined" && key !== "") return key;
  } catch (e) {
    // Falha silenciosa se process não estiver definido
  }
  return null;
};

/**
 * Gera flashcards utilizando o modelo Gemini.
 */
export const generateFlashcards = async (text: string, subjectName: string) => {
  const apiKey = getSafeApiKey();
  
  if (!apiKey) {
    throw new Error("DILIGÊNCIA NECESSÁRIA: A 'API_KEY' não foi configurada nas variáveis de ambiente do seu projeto (Vercel/GitHub).");
  }

  // Inicializa apenas com chave válida para evitar o erro interno da biblioteca
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
    if (err.message?.includes("API Key") || err.message?.includes("invalid") || err.status === 400) {
      throw new Error("ERRO DE PROTOCOLO: A chave de API fornecida parece inválida ou não tem permissão para este modelo.");
    }
    throw new Error("Erro no processamento da IA. Verifique sua conexão ou tente novamente.");
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
