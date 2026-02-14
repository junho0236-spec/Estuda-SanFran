
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY não encontrada. Verifique as configurações na Vercel.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateFlashcards = async (text: string, subjectName: string) => {
  try {
    const ai = getAI();
    // Usando gemini-2.0-flash que costuma ser mais estável para JSON schema
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', 
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

    if (!response.text) throw new Error("IA retornou corpo vazio.");
    return JSON.parse(response.text.trim());
  } catch (err: any) {
    console.error("Erro Gemini Service:", err);
    throw new Error(err.message || "Erro desconhecido na IA.");
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Dê uma frase motivacional jurídica curta para quem estuda: ${subjects.join(', ')}.`,
    });
    return response.text;
  } catch (e) {
    return "A justiça é a constante e perpétua vontade de dar a cada um o seu.";
  }
};
