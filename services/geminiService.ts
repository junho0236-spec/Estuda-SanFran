import * as GoogleAI from "@google/generative-ai";
const { GoogleGenAI, SchemaType } = GoogleAI;
// Sua chave paga de US$ 300
const API_KEY = "AIzaSyD73fUpmZa7ixffTb7cswoLpdzzMdbKQZE";
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

    const prompt = `Gere ${quantity} flashcards (Pergunta/Resposta) sobre "${subjectName}": ${text}`;
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("Erro:", error);
    throw error;
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Dê uma frase curta em latim com tradução para estudantes de Direito.");
    return result.response.text();
  } catch {
    return "Scientia Vinces.";
  }
};

export const simplifyLegalText = async (complexText: string) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(`Simplifique: ${complexText}`);
  return result.response.text();
};
