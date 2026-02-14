
import { GoogleGenAI, Type } from "@google/genai";

// Função auxiliar para inicializar a IA apenas quando necessário
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY não configurada na Vercel.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateFlashcards = async (text: string, subjectName: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Transforme o seguinte conteúdo sobre "${subjectName}" em uma lista de cartões de estudo (flashcards). 
    Crie cartões concisos e diretos com Pergunta e Resposta.
    Texto base: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING, description: 'A pergunta ou conceito.' },
            back: { type: Type.STRING, description: 'A resposta ou explicação.' }
          },
          required: ["front", "back"]
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
};

export const getStudyMotivation = async (subjects: string[]) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Estou estudando as seguintes disciplinas: ${subjects.join(', ')}. Me dê uma dica rápida de estudo ou frase motivacional curta.`,
    });
    return response.text;
  } catch (e) {
    return "A justiça é a constante e perpétua vontade de dar a cada um o seu.";
  }
};
