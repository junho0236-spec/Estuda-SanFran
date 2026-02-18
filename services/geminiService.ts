import { GoogleGenAI, Type } from "@google/genai";

// Inicializa o cliente Google GenAI de forma preguiçosa (lazy)
let aiInstance: GoogleGenAI | null = null;

const getApiKey = () => {
  // Tenta acessar diretamente a variável do Vite. 
  // O bundler substitui import.meta.env.VITE_GEMINI_API_KEY pelo valor em tempo de build.
  // Verificação explícita para evitar problemas com 'undefined'.
  const meta = import.meta as any;
  if (typeof meta !== 'undefined' && meta.env && meta.env.VITE_GEMINI_API_KEY) {
    return meta.env.VITE_GEMINI_API_KEY;
  }
  
  // Fallback para process.env (compatibilidade com configs manuais ou outros environments)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }

  return "";
};

const getAiClient = () => {
  if (!aiInstance) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
      console.warn("Gemini API Key is missing. Ensure VITE_GEMINI_API_KEY is set in Vercel Environment Variables.");
      // Inicializa com string placeholder para a aplicação não quebrar na inicialização,
      // mas falhará graciosamente na requisição.
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
  const key = getApiKey();
  return key ? `${key.substring(0, 4)}...` : null;
};

/**
 * Gera flashcards a partir de um texto jurídico ou acadêmico utilizando Gemini.
 */
export const generateFlashcards = async (text: string, subjectName: string, quantity: number = 5) => {
  try {
    const ai = getAiClient();
    
    // Validação prévia de segurança
    if (getApiKey() === "") {
        throw new Error("Chave de API não configurada (VITE_GEMINI_API_KEY).");
    }

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
  } catch (error: any) {
    console.error("Erro detalhado ao gerar flashcards:", error);
    // Propaga o erro para ser tratado na UI (alert) se for crítico
    if (error.message.includes("API Key") || error.status === 400 || error.status === 403) {
        throw new Error("Erro de Autenticação na IA. Verifique a VITE_GEMINI_API_KEY.");
    }
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