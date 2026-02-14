
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Tenta obter a chave de API de múltiplas fontes.
 */
const getApiKey = () => {
  return process.env.API_KEY || "";
};

export const generateFlashcards = async (text: string, subjectName: string) => {
  const apiKey = getApiKey();
  
  if (!apiKey || apiKey === "undefined") {
    throw new Error("A IA da SanFran precisa de uma chave de API. Se você é o dono do app, configure 'API_KEY' na Vercel. Se é usuário, use o botão 'Ativar IA' na lateral.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Você é um tutor da SanFran (Academia Jurídica FDUSP). Converta o texto em flashcards Anki.
      
      DISCIPLINA: ${subjectName}
      TEXTO: ${text}
      
      JSON com campos 'front' e 'back'.`,
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

    return JSON.parse(response.text.trim());
  } catch (err: any) {
    console.error("Erro Gemini:", err);
    throw err;
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === "undefined") return "A justiça é a constante e perpétua vontade de dar a cada um o seu.";

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Frase curta de motivação jurídica (SanFran) para: ${subjects.join(', ')}.`,
    });
    return response.text;
  } catch (e) {
    return "Scientia Vinces.";
  }
};
