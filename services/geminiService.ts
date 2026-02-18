import { GoogleGenAI, SchemaType } from "@google/generative-ai";

// O "import.meta.env" é o comando que pega a chave escondida na Vercel
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Se a chave não estiver lá, o genAI vai receber uma string vazia para não quebrar o build
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
