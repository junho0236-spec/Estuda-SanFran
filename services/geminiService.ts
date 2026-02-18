
import { GoogleGenAI, Type } from "@google/genai";

// Inicializa o cliente Google GenAI de forma preguiçosa (lazy)
let aiInstance: GoogleGenAI | null = null;

const getApiKey = (): string => {
  // Obtém a chave de API exclusivamente de process.env.API_KEY conforme diretrizes.
  const key = process.env.API_KEY;
  
  // Log discreto para debug em produção (não revela a chave inteira)
  if (!key) {
    console.warn("Gemini Service: API_KEY está vazia ou indefinida.");
  } else {
    console.log("Gemini Service: API Key carregada com sucesso (tamanho: " + key.length + ")");
  }

  return key || "";
};

const getAiClient = () => {
  if (!aiInstance) {
    const apiKey = getApiKey();
    // Inicializa mesmo sem chave para não quebrar o app no load, o erro será pego na chamada
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
        throw new Error("A chave de API (API_KEY) não foi detectada no código. Se você acabou de adicioná-la na Vercel, é OBRIGATÓRIO ir em 'Deployments' e clicar em 'Redeploy' para que a chave seja embutida no site.");
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
    
    if (error.status === 403 || (error.message && error.message.includes("API key"))) {
        throw new Error("Erro de Permissão (403): Verifique se a API_KEY na Vercel é válida e corresponde a um projeto Google AI Studio ativo.");
    }
    if (error.status === 400) {
        throw new Error("Erro na Requisição (400): O texto pode ser muito longo ou inválido.");
    }
    if (error.status === 429) {
        throw new Error("Muitas requisições. O modelo está sobrecarregado. Aguarde um momento.");
    }
    
    throw error;
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
    const apiKey = getApiKey();

    if (!apiKey) {
      return "Erro: Chave de API não configurada. Verifique as variáveis de ambiente.";
    }

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
