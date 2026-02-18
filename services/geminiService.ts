import { createClient, Type } from "@google/genai";

// 1. Chave fixa para garantir o uso da conta de faturamento
const API_KEY = "AIzaSyD73fUpmZa7ixffTb7cswoLpdzzMdbKQZE";

// 2. Inicialização correta para a biblioteca @google/genai
const client = createClient({
  apiKey: API_KEY,
});

/**
 * Retorna a chave de API configurada.
 */
export const getSafeApiKey = (): string | null => {
  return API_KEY;
};

/**
 * Gera flashcards utilizando Gemini.
 */
export const generateFlashcards = async (text: string, subjectName: string, quantity: number = 5) => {
  try {
    // Usamos 'gemini-1.5-flash' diretamente aqui
    const response = await client.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Você é um professor de Direito da USP. Sua tarefa é criar materiais de estudo ativo.
      
      Analise o seguinte texto jurídico sobre "${subjectName}":
      "${text}"
      
      Gere EXATAMENTE ${quantity} flashcards no formato Pergunta e Resposta.
      - Perguntas (front) desafiadoras.
      - Respostas (back) objetivas e fundamentadas.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
            },
            required: ['front', 'back'],
          },
        },
      },
    });

    // Na biblioteca nova, o texto vem em response.text
    const resultText = response.text;
    if (!resultText) return [];

    return JSON.parse(resultText);
  } catch (error) {
    console.error("Erro ao gerar flashcards:", error);
    throw error;
  }
};

/**
 * Frase de motivação em latim.
 */
export const getStudyMotivation = async (subjects: string[]) => {
  const list = subjects.length > 0 ? subjects.join(", ") : "Direito";
  
  try {
    const response = await client.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Sou um estudante de Direito na SanFran (USP). Atualmente estudo: ${list}. Dê uma frase curta de motivação em latim e sua tradução.`,
    });
    return response.text || "Scientia Vinces.";
  } catch (error) {
    return "Scientia Vinces.";
  }
};

/**
 * Simplifica textos jurídicos.
 */
export const simplifyLegalText = async (complexText: string) => {
  try {
    const response = await client.models.generateContent({
      model: 'gemini-1.5-flash', 
      contents: `Traduza o texto jurídico para linguagem clara para um estudante de primeiro ano:
      "${complexText}"`,
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao simplificar:", error);
    throw error;
  }
};
