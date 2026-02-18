import { GoogleGenAI, SchemaType } from "@google/generative-ai";

// Sua chave paga de US$ 300
const API_KEY = "AIzaSyD73fUpmZa7ixffTb7cswoLpdzzMdbKQZE";

// Inicialização segura
const genAI = new GoogleGenAI(API_KEY);

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

    const prompt = `Gere ${quantity} flashcards de estudo ativo sobre o texto de "${subjectName}": "${text}".`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error("Erro na IA:", error);
    throw error;
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Dê uma frase curta de motivação em latim com tradução.");
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
