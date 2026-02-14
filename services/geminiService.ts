
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Tenta obter a chave de API do ambiente.
 * Se não existir, retorna undefined para que o SDK dispare o erro controlado.
 */
// Fix: Renomeado para getSafeApiKey para coincidir com o uso no Dashboard e exportado.
export const getSafeApiKey = () => {
  return process.env.API_KEY;
};

/**
 * Gera flashcards utilizando o modelo Gemini.
 */
export const generateFlashcards = async (text: string, subjectName: string) => {
  const apiKey = getSafeApiKey();
  
  if (!apiKey || apiKey === "undefined") {
    throw new Error("DILIGÊNCIA NECESSÁRIA: Chave de API não encontrada no navegador. Verifique as variáveis de ambiente na Vercel.");
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

    return JSON.parse(response.text.trim());
  } catch (err: any) {
    console.error("Erro Gemini:", err);
    if (err.message?.includes("API Key") || err.message?.includes("API_KEY")) {
      throw new Error("CHAVE_AUSENTE: A chave de API não foi injetada corretamente no navegador.");
    }
    throw new Error(err.message || "Erro ao processar IA.");
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  const apiKey = getSafeApiKey();
  if (!apiKey || apiKey === "undefined") return "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano";

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
