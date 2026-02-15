
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Obtém a chave de API exclusivamente do ambiente.
 */
// Renomeado para getSafeApiKey e exportado para resolver o erro de importação no Dashboard.tsx
export const getSafeApiKey = (): string => {
  return process.env.API_KEY || "";
};

/**
 * Gera flashcards utilizando o modelo Gemini 3 Pro para tarefas complexas de raciocínio jurídico.
 */
export const generateFlashcards = async (text: string, subjectName: string) => {
  const apiKey = getSafeApiKey();
  
  if (!apiKey) {
    throw new Error("DILIGÊNCIA NECESSÁRIA: A variável de ambiente 'API_KEY' não foi configurada. Verifique as configurações do sistema.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      // Utilizando gemini-3-pro-preview para tarefas que exigem raciocínio jurídico avançado e precisão técnica
      model: 'gemini-3-pro-preview', 
      contents: `Você é um tutor da SanFran (Academia Jurídica FDUSP). Sua tarefa é converter o texto jurídico abaixo em uma lista de Flashcards para Anki.
      
      DISCIPLINA: ${subjectName}
      TEXTO PARA PROCESSAR: ${text}
      
      REGRAS:
      - Responda APENAS com o JSON.
      - Foco em prazos processuais, conceitos em latim, súmulas e doutrina clássica.
      - Crie perguntas instigantes na frente (front) e respostas fundamentadas no verso (back).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: 'Pergunta ou enunciado jurídico.' },
              back: { type: Type.STRING, description: 'Resposta ou fundamentação doutrinária.' }
            },
            required: ["front", "back"]
          }
        }
      }
    });

    // Acessando a propriedade .text (não é um método) conforme as diretrizes do SDK para extrair o JSON
    const jsonStr = response.text?.trim();
    if (!jsonStr) throw new Error("O magistrado digital (IA) não retornou conteúdo válido.");
    
    return JSON.parse(jsonStr);
  } catch (err: any) {
    console.error("Erro na extração de doutrina via Gemini:", err);
    // Propaga a mensagem de erro real para o usuário
    throw new Error(err.message || "Erro inesperado no processamento da IA.");
  }
};

/**
 * Gera motivação erudita para o painel principal.
 */
export const getStudyMotivation = async (subjects: string[]) => {
  const apiKey = getSafeApiKey();
  if (!apiKey) return "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano";

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma frase de motivação curta e impactante para um estudante de Direito da SanFran (USP) que está estudando: ${subjects.length > 0 ? subjects.join(', ') : 'Ciências Jurídicas'}. Use um tom erudito, clássico e inspirador.`,
    });
    // Retornando a propriedade .text da resposta gerada pelo modelo
    return response.text || "Justitia est constans et perpetua voluntas ius suum cuique tribuendi.";
  } catch (e) {
    return "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano";
  }
};
