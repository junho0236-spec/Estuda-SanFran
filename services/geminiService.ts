
import { GoogleGenAI, Type } from "@google/genai";

export const generateFlashcards = async (text: string, subjectName: string) => {
  // A chave é injetada automaticamente no ambiente como process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Você é um tutor da SanFran (Academia Jurídica FDUSP). Sua tarefa é converter o texto jurídico abaixo em uma lista de Flashcards (Anki).
      
      DISCIPLINA: ${subjectName}
      TEXTO BASE: ${text}
      
      Regras:
      1. Use linguagem técnica mas clara.
      2. Foque em conceitos fundamentais, prazos ou jurisprudência.
      3. Responda APENAS com o JSON solicitado.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: 'Pergunta ou conceito jurídico (Frente).' },
              back: { type: Type.STRING, description: 'Resposta ou explicação doutrinária (Verso).' }
            },
            required: ["front", "back"],
            propertyOrdering: ["front", "back"]
          }
        }
      }
    });

    const result = response.text;
    if (!result) throw new Error("A IA não retornou um conteúdo válido.");
    
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
      contents: `Gere uma única frase de motivação curta para um estudante de Direito da SanFran. 
      Disciplinas atuais: ${subjects.join(', ')}. 
      Estilo: Erudito, inspirador, citando a tradição jurídica brasileira.`,
    });
    return response.text;
  } catch (e) {
    return "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano";
  }
};
