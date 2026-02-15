
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Obtém a chave de API exclusivamente do ambiente.
 */
export const getSafeApiKey = (): string | null => {
  return process.env.API_KEY || null;
};

/**
 * Gera flashcards utilizando o modelo Gemini 3.
 */
export const generateFlashcards = async (text: string, subjectName: string) => {
  const apiKey = getSafeApiKey();
  
  if (!apiKey) {
    throw new Error("DILIGÊNCIA NECESSÁRIA: API_KEY não configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Converta o texto jurídico abaixo em JSON para Flashcards Anki.
      DISCIPLINA: ${subjectName}
      TEXTO: ${text}
      REGRAS: Retorne APENAS um array de objetos com "front" (pergunta) e "back" (resposta).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING }
            },
            required: ["front", "back"]
          }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("A IA retornou uma resposta vazia.");
    return JSON.parse(jsonStr.trim());
  } catch (err: any) {
    console.error("Erro Gemini:", err);
    throw new Error("Falha na extração via IA. Tente o modo de Importação em Lote.");
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  const apiKey = getSafeApiKey();
  if (!apiKey) return "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano";

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma frase de motivação curta para um estudante de Direito (USP SanFran) que estuda: ${subjects.join(', ')}.`,
    });
    return response.text || "Scientia Vinces.";
  } catch (e) {
    return "A justiça é a constante e perpétua vontade de dar a cada um o seu.";
  }
};
