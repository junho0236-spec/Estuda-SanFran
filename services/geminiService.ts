
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Gera flashcards utilizando o modelo Gemini.
 * De acordo com as diretrizes, a chave de API é obtida exclusivamente de process.env.API_KEY.
 */
export const generateFlashcards = async (text: string, subjectName: string) => {
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

    if (!response.text) throw new Error("O modelo não retornou uma resposta válida.");
    return JSON.parse(response.text.trim());
  } catch (err: any) {
    console.error("Erro Gemini:", err);
    // Erros de autenticação (como chave ausente ou inválida) serão capturados aqui
    if (err.message?.includes("API key") || err.status === 401 || err.status === 403) {
      throw new Error("Erro de Autenticação na IA. Certifique-se de que o sistema está configurado corretamente com a API_KEY.");
    }
    throw new Error("Ocorreu um erro ao processar o texto jurídico. Tente novamente em instantes.");
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
