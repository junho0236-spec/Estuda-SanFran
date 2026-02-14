
import { GoogleGenAI, Type } from "@google/genai";

export const getSafeApiKey = (): string | null => {
  try {
    const processKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : null;
    if (processKey && processKey !== "undefined" && processKey !== "") return processKey;

    // @ts-ignore
    const viteKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_KEY : null;
    if (viteKey && viteKey !== "undefined" && viteKey !== "") return viteKey;

    // @ts-ignore
    const globalKey = window.__API_KEY__;
    if (globalKey && globalKey !== "") return globalKey;

  } catch (e) {}
  return null;
};

export const generateFlashcards = async (
  text: string, 
  subjectName: string, 
  config?: { count: string, frontLength: string, backLength: string }
) => {
  const apiKey = getSafeApiKey();
  
  if (!apiKey) {
    throw new Error("DILIGÊNCIA NECESSÁRIA: A variável 'API_KEY' não está visível.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const countInstruction = config?.count === 'auto' 
    ? "gere uma quantidade proporcional à densidade do texto" 
    : `gere exatamente ${config?.count} flashcards`;

  const frontInstruction = {
    curto: "A frente deve ser uma pergunta direta e curta.",
    medio: "A frente deve ser uma pergunta contextualizada de tamanho médio.",
    longo: "A frente deve ser um caso clínico ou enunciado longo e detalhado."
  }[config?.frontLength || 'medio'];

  const backInstruction = {
    curto: "O verso deve ser uma resposta direta e lacônica.",
    medio: "O verso deve ser uma resposta fundamentada com citação doutrinária moderada.",
    longo: "O verso deve ser uma explicação exaustiva, profunda e detalhada sobre o tema."
  }[config?.backLength || 'medio'];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Você é um tutor da SanFran (Academia Jurídica FDUSP).
      
      DISCIPLINA: ${subjectName}
      CONFIGURAÇÃO: 
      - Quantidade: ${countInstruction}
      - Estilo Frente: ${frontInstruction}
      - Estilo Verso: ${backInstruction}
      
      TEXTO PARA PROCESSAR: ${text}
      
      REGRAS:
      - Responda APENAS com o JSON.
      - Foco em prazos, conceitos latinos e doutrina clássica.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING }
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
    throw new Error("Erro no processamento da IA.");
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  const apiKey = getSafeApiKey();
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
