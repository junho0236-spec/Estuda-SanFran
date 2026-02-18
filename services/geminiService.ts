
import { GoogleGenAI, Type } from "@google/genai";

// Inicializa o cliente Google GenAI utilizando a API KEY do ambiente
const ai = new GoogleGenAI({ apiKey: "AIzaSyD73fUpmZa7ixffTb7cswoLpdzzMdbKQZE" });

/**
 * Retorna a chave de API configurada no ambiente.
 */
export const getSafeApiKey = (): string | null => {
  return "AIzaSyD73fUpmZa7ixffTb7cswoLpdzzMdbKQZE" || null;
};

/**
 * Gera flashcards a partir de um texto jurídico ou acadêmico utilizando Gemini.
 * Ideal para tarefas complexas de estruturação de conhecimento.
 */
export const generateFlashcards = async (text: string, subjectName: string, quantity: number = 5) => {
  try {
    const response = await ai.models.generateContent({
      model: 'models/gemini-1.5-flash', // Modelo otimizado para velocidade e custo em tarefas de extração
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
    throw error;
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
      model: 'models/gemini-1.5-flash',
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
      model: 'models/gemini-1.5-flash', 
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
