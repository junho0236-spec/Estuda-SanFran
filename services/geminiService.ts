
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFlashcards = async (text: string, subjectName: string) => {
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

  // Ensure response.text is not undefined to avoid JSON.parse errors
  return JSON.parse(response.text || '[]');
};

export const getStudyMotivation = async (subjects: string[]) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Estou estudando as seguintes disciplinas: ${subjects.join(', ')}. Me dê uma dica rápida de estudo ou frase motivacional curta.`,
  });
  // The .text property is a string | undefined
  return response.text;
};
