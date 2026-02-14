
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Verifica se a API_KEY está disponível no ambiente.
 */
const getApiKey = () => {
  const key = process.env.API_KEY;
  if (!key || key === "undefined" || key === "") return null;
  return key;
};

/**
 * Gera flashcards utilizando o modelo Gemini.
 */
export const generateFlashcards = async (text: string, subjectName: string) => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("CHAVE_AUSENTE: A API_KEY não foi detectada no ambiente. Verifique o painel da Vercel.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
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

    if (!response.text) throw new Error("A IA não retornou conteúdo.");
    return JSON.parse(response.text.trim());
  } catch (err: any) {
    console.error("Erro Gemini:", err);
    if (err.message?.includes("API Key") || err.message?.includes("API_KEY")) {
      throw new Error("CHAVE_INVALIDA: A chave fornecida é inválida ou expirou.");
    }
    throw new Error("Erro no processamento da IA. Tente novamente em instantes.");
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  const apiKey = getApiKey();
  if (!apiKey) return "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano";

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
