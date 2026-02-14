
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Gera flashcards utilizando o modelo Gemini.
 * A instância do GoogleGenAI é criada dentro da função para garantir o uso da chave mais recente.
 */
export const generateFlashcards = async (text: string, subjectName: string) => {
  // Cria a instância no momento da chamada para pegar a chave injetada pelo seletor
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Você é um tutor da SanFran (Academia Jurídica FDUSP). Sua tarefa é converter o texto jurídico abaixo em uma lista de Flashcards para Anki.
      
      DISCIPLINA: ${subjectName}
      TEXTO PARA PROCESSAR: ${text}
      
      REGRAS:
      - Responda APENAS com o JSON.
      - Foco em prazos, conceitos latinos e doutrina clássica.
      - Crie perguntas instigantes na frente (front) e respostas fundamentadas no verso (back).`,
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
            required: ["front", "back"]
          }
        }
      }
    });

    if (!response.text) throw new Error("A IA não retornou conteúdo. Verifique sua conexão.");
    return JSON.parse(response.text.trim());
  } catch (err: any) {
    console.error("Erro no processamento Gemini:", err);
    if (err.message?.includes("API key") || err.message?.includes("entity was not found")) {
      throw new Error("Sua chave de IA expirou ou é inválida. Clique em 'Ativar IA' novamente.");
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
