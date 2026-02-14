
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Função para gerar flashcards. 
 * Instancia a IA no momento da chamada para garantir que a API_KEY do ambiente ou do seletor seja utilizada.
 */
export const generateFlashcards = async (text: string, subjectName: string) => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("API Key não configurada. Por favor, clique em 'Ativar IA' na barra lateral ou configure no painel da Vercel.");
  }

  // Criar instância nova por chamada para evitar cache de chaves inválidas
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Você é um tutor da SanFran (Academia Jurídica FDUSP). Sua tarefa é converter o texto jurídico abaixo em uma lista de Flashcards para Anki.
      
      DISCIPLINA: ${subjectName}
      TEXTO PARA PROCESSAR: ${text}
      
      REGRAS:
      - Responda APENAS com o JSON solicitado.
      - Foco em prazos, conceitos latinos e doutrina clássica.
      - Crie perguntas instigantes na frente e respostas fundamentadas no verso.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: 'Pergunta (Frente).' },
              back: { type: Type.STRING, description: 'Resposta (Verso).' }
            },
            required: ["front", "back"],
            propertyOrdering: ["front", "back"]
          }
        }
      }
    });

    const result = response.text;
    if (!result) throw new Error("A IA não retornou conteúdo.");
    
    return JSON.parse(result.trim());
  } catch (err: any) {
    if (err.message?.includes("entity was not found")) {
      throw new Error("Projeto da API não encontrado. Verifique se o projeto no Google Cloud tem faturamento ativo.");
    }
    throw err;
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") return "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano";

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma frase de motivação curta para um estudante de Direito da SanFran que estuda: ${subjects.join(', ')}. Estilo erudito e clássico.`,
    });
    return response.text;
  } catch (e) {
    return "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano";
  }
};
