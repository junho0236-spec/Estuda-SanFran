
import { GoogleGenAI, Type } from "@google/genai";

// Inicializa o cliente Google GenAI utilizando a API KEY do ambiente
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Retorna a chave de API configurada no ambiente.
 */
export const getSafeApiKey = (): string | null => {
  return process.env.API_KEY || null;
};

/**
 * Gera flashcards a partir de um texto jurídico ou acadêmico utilizando Gemini 3 Pro.
 * Ideal para tarefas complexas de estruturação de conhecimento.
 */
export const generateFlashcards = async (text: string, subjectName: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Com base no seguinte texto acadêmico da disciplina de "${subjectName}", gere uma lista de flashcards (pergunta e resposta curta). Texto: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: {
              type: Type.STRING,
              description: 'A pergunta ou conceito jurídico do flashcard.',
            },
            back: {
              type: Type.STRING,
              description: 'A resposta ou explicação doutrinária do flashcard.',
            },
          },
          required: ['front', 'back'],
        },
      },
    },
  });

  const resultText = response.text;
  if (!resultText) return [];

  try {
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Erro ao processar JSON de flashcards:", error);
    return [];
  }
};

/**
 * Retorna uma frase de motivação em latim com tradução, baseada no contexto das disciplinas estudadas.
 * Utiliza Gemini 3 Flash para baixa latência.
 */
export const getStudyMotivation = async (subjects: string[]) => {
  const list = subjects.length > 0 ? subjects.join(", ") : "Direito";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sou um estudante de Direito na SanFran (USP). Atualmente estudo: ${list}. Dê uma frase curta de motivação em latim relevante ao estudo jurídico e sua tradução em português.`,
    });
    return response.text || "Scientia Vinces.";
  } catch (error) {
    console.warn("Erro ao buscar motivação via IA:", error);
    return "Scientia Vinces.";
  }
};

/**
 * Simplifica textos jurídicos complexos usando o modelo Flash (Custo Eficiente).
 */
export const simplifyLegalText = async (complexText: string) => {
  try {
    const response = await ai.models.generateContent({
      // MODELO MAIS BARATO E RÁPIDO
      model: 'gemini-3-flash-preview', 
      contents: `Você é um professor assistente da Faculdade de Direito do Largo São Francisco. 
      Sua tarefa é "traduzir" o seguinte texto jurídico complexo (juridiquês) para uma linguagem clara, didática e direta, acessível a um estudante de primeiro ano.
      Mantenha a precisão técnica, mas explique termos difíceis se necessário.
      
      Texto para simplificar:
      "${complexText}"`,
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao simplificar texto:", error);
    throw error;
  }
};
