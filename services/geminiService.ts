
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
    
    // Se não tiver chave, inicializa com string vazia para não quebrar o app imediatamente,
    // mas a chamada de API falhará com erro claro.
    aiInstance = new GoogleGenAI({ apiKey: apiKey || "missing_key" });
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
    const apiKey = getApiKey();
    
    if (!apiKey) {
        throw new Error("Chave de API não encontrada. Verifique se 'VITE_GEMINI_API_KEY' está configurada na Vercel e faça um Redeploy.");
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Você é um professor de Direito da USP. Sua tarefa é criar materiais de estudo ativo.
      
      Analise o seguinte texto jurídico sobre "${subjectName}":
      "${text}"
      
      Gere EXATAMENTE ${quantity} flashcards de alta qualidade no formato Pergunta e Resposta.
      - As perguntas (front) devem ser desafiadoras e focar em conceitos-chave, prazos, exceções ou princípios.
      - As respostas (back) devem ser objetivas, didáticas e, se possível, citar o artigo de lei ou súmula pertinente.
      - Se o texto fornecido for sem sentido ou muito curto, retorne um array vazio.`,
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
    
    if (!resultText) {
        throw new Error("A IA retornou uma resposta vazia. Tente outro texto.");
    }

    try {
        const parsed = JSON.parse(resultText);
        if (!Array.isArray(parsed)) {
            throw new Error("Formato de resposta inválido (não é lista).");
        }
        return parsed;
    } catch (parseError) {
        console.error("JSON Parse Error:", resultText);
        throw new Error("Erro ao processar resposta da IA.");
    }

  } catch (error: any) {
    console.error("Erro detalhado ao gerar flashcards:", error);
    
    // Tratamento de erros específicos da API para mensagem mais amigável
    if (error.status === 403 || (error.message && error.message.includes("API key"))) {
        throw new Error("Erro de Permissão (403): Verifique sua VITE_GEMINI_API_KEY.");
    }
    if (error.status === 400) {
        throw new Error("Erro na Requisição (400): O texto pode ser muito longo ou inválido.");
    }
    if (error.status === 429) {
        throw new Error("Muitas requisições. Aguarde um momento.");
    }
    
    throw error; // Propaga o erro original para o componente
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
  } catch (error: any) {
    console.error("Erro ao simplificar texto:", error);
    if (error.message.includes("API key")) return "Erro de Configuração: API Key inválida.";
    return "Não foi possível simplificar o texto no momento. Verifique sua conexão.";
  }
};
