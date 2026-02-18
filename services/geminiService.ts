import { GoogleGenAI, SchemaType } from "@google/generative-ai";

// 1. Sua chave paga de US$ 300
const API_KEY = "AIzaSyD73fUpmZa7ixffTb7cswoLpdzzMdbKQZE";

// 2. Inicialização correta para a biblioteca @google/generative-ai
const genAI = new GoogleGenAI(API_KEY);

export const getSafeApiKey = (): string | null => {
  return API_KEY;
};

export const generateFlashcards = async (text: string, subjectName: string, quantity: number = 5) => {
  try {
    // Usando o modelo estável que aceita JSON
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

    const prompt = `Você é um professor de Direito da USP (SanFran). Gere EXATAMENTE ${quantity} flashcards de estudo ativo sobre o texto de "${subjectName}": "${text}".`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const resultText = response.text();

    return JSON.parse(resultText);
  } catch (error) {
    console.error("Erro ao gerar flashcards:", error);
    throw error;
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  const list = subjects.length > 0 ? subjects.join(", ") : "Direito";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`Frase curta de motivação em latim para quem estuda ${list} na SanFran, com tradução.`);
    const response = await result.response;
    return response.text() || "Scientia Vinces.";
  } catch (error) {
    return "Scientia Vinces.";
  }
};

export const simplifyLegalText = async (complexText: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`Explique de forma simples para um aluno do 1º ano da USP: ${complexText}`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Erro ao simplificar:", error);
    throw error;
  }
};
