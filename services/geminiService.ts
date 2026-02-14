
import { GoogleGenAI, Type } from "@google/genai";

export const generateFlashcards = async (text: string, subjectName: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Você é um tutor da SanFran (FDUSP). Transforme o conteúdo sobre "${subjectName}" em Flashcards para estudo.
      O texto é: ${text}
      Responda apenas com o JSON conforme o esquema solicitado.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: 'Pergunta ou conceito jurídico.' },
              back: { type: Type.STRING, description: 'Resposta fundamentada ou explicação.' }
            },
            required: ["front", "back"]
          }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("IA retornou corpo vazio.");
    return JSON.parse(jsonStr.trim());
  } catch (err: any) {
    console.error("Erro Gemini Service:", err);
    throw new Error(err.message || "Erro desconhecido na IA.");
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Dê uma frase motivacional jurídica curta e impactante para quem estuda as seguintes disciplinas: ${subjects.join(', ')}. Foque na excelência e na tradição da SanFran.`,
    });
    return response.text;
  } catch (e) {
    return "A justiça é a constante e perpétua vontade de dar a cada um o seu.";
  }
};
