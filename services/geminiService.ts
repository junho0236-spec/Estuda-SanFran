
import { GoogleGenAI, Type } from "@google/genai";

// Inicializa o cliente Google GenAI de forma preguiçosa (lazy)
let aiInstance: GoogleGenAI | null = null;

const getApiKey = () => {
  let key = "";

  // 1. Tenta acessar via Vite (import.meta.env) - Prioridade para VITE_GEMINI_API_KEY
  try {
    const meta = import.meta as any;
    if (meta && meta.env) {
      if (meta.env.VITE_GEMINI_API_KEY) {
        key = meta.env.VITE_GEMINI_API_KEY;
      } else if (meta.env.API_KEY) {
        // Fallback legado
        key = meta.env.API_KEY;
      }
    }
  } catch (e) {
    // Ignora erro se import.meta não estiver disponível
  }
  
  // 2. Tenta acessar via process.env (Vercel/Node fallback) se ainda não encontrou
  if (!key && typeof process !== 'undefined' && process.env) {
    if (process.env.VITE_GEMINI_API_KEY) {
      key = process.env.VITE_GEMINI_API_KEY;
    } else if (process.env.API_KEY) {
      key = process.env.API_KEY;
    }
  }

  // 3. Fallback manual (se injetado via script window)
  if (!key && typeof window !== 'undefined' && (window as any).__API_KEY__) {
    key = (window as any).__API_KEY__;
  }

  return key;
};

const getAiClient = () => {
  if (!aiInstance) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
      console.warn("Gemini API Key is missing. Ensure VITE_GEMINI_API_KEY is set in Vercel Environment Variables.");
      // Inicializa com string placeholder para não quebrar a aplicação imediatamente, 
      // o erro real aparecerá quando tentar fazer uma requisição.
      aiInstance = new GoogleGenAI({ apiKey: "missing-key" });
    } else {
      aiInstance = new GoogleGenAI({ apiKey });
    }
  }
  return aiInstance;
};

/**
 * Retorna a chave de API configurada no ambiente (para debug se necessário).
 */
export const getSafeApiKey = (): string | null => {
  return getApiKey() || null;
};

/**
 * Gera flashcards a partir de um texto jurídico ou acadêmico utilizando Gemini.
 */
export const generateFlashcards = async (text: string, subjectName: string, quantity: number = 5) => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Você é um professor de Direito da USP. Sua tarefa é criar materiais de estudo ativo.
      
      Analise o seguinte texto jurídico sobre "${subjectName}":
      "${text}"
      
      Gere EXATAMENTE ${quantity} flashcards de alta qualidade no formato Pergunta e Resposta.
      - As perguntas (front) devem ser desafiadoras e focar em conceitos-chave, prazos, exceções ou princípios.
      - As respostas (back) devem ser objetivas, didáticas e, se possível, citar o artigo de lei ou súmula pertinente.
      - Evite perguntas de "Sim/Não".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: {
                type: Type.STRING,
                description: 'A pergunta jurídica, caso prático curto ou conceito a ser definido.',
              },
              back: {
                type: Type.STRING,
                description: 'A resposta correta, explicação doutrinária e fundamentação legal.',
              },
            },
            required: ['front', 'back'],
          },
        },
      },
    });

    const resultText = response.text;
    if (!resultText) return [];

    return JSON.parse(resultText);
  } catch (error) {
    console.error("Erro ao gerar flashcards com IA:", error);
    return [];
  }
};

/**
 * Retorna uma frase de motivação em latim com tradução.
 */
export const getStudyMotivation = async (subjects: string[]) => {
  const list = subjects.length > 0 ? subjects.join(", ") : "Direito";
  
  try {
    const ai = getAiClient();
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
 * Simplifica textos jurídicos complexos.
 */
export const simplifyLegalText = async (complexText: string) => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
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
    return "Não foi possível simplificar o texto no momento. Verifique sua conexão ou a chave de API.";
  }
};
