
import { GoogleGenAI, Type } from "@google/genai";

export const generateFlashcards = async (text: string, subjectName: string) => {
  // A inicialização deve ocorrer sempre dentro da função para capturar a chave do ambiente mais recente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Você é um tutor da SanFran (Academia Jurídica FDUSP). Sua tarefa é converter o texto jurídico abaixo em uma lista de Flashcards para Anki.
      
      DISCIPLINA: ${subjectName}
      TEXTO PARA PROCESSAR: ${text}
      
      REGRAS:
      - Responda APENAS com o JSON solicitado.
      - Foco em prazos, conceitos latinos e doutrina clássica.`,
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
    console.error("Erro no Protocolo Gemini:", err);
    throw err;
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
