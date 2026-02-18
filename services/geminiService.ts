import * as GoogleGenerativeAI from "@google/generative-ai";

// Busca a chave de forma segura na Vercel
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Técnica de detecção para evitar o erro de "not exported"
const GoogleGenAI = (GoogleGenerativeAI as any).GoogleGenAI || (GoogleGenerativeAI as any).default?.GoogleGenAI;
const SchemaType = (GoogleGenerativeAI as any).SchemaType || (GoogleGenerativeAI as any).default?.SchemaType;

const genAI = new GoogleGenAI(API_KEY || "");

export const getSafeApiKey = () => API_KEY;

export const generateFlashcards = async (text: string, subjectName: string, quantity: number = 5) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              front: { type: SchemaType.STRING },
              back: { type: SchemaType.STRING },
            },
            required: ["front", "back"],
          },
        },
      },
    });

    const prompt = `Você é um professor da SanFran. Gere ${quantity} flashcards sobre: ${text}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error("Erro na geração:", error);
    throw error;
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Dê uma frase curta em latim com tradução.");
    const response = await result.response;
    return response.text();
  } catch {
    return "Scientia Vinces.";
  }
};

export const simplifyLegalText = async (complexText: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`Simplifique este texto jurídico: ${complexText}`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    throw error;
  }
};
