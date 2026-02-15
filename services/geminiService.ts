
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

const cleanJsonResponse = (rawText: string): string => {
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```json\n?/, "");
  cleaned = cleaned.replace(/```$/, "");
  return cleaned.trim();
};

export const generateFlashcards = async (
  text: string, 
  subjectName: string, 
  config?: { count: string, frontLength: string, backLength: string }
) => {
  const apiKey = getSafeApiKey();
  
  if (!apiKey) {
    throw new Error("DILIGÊNCIA NECESSÁRIA: A variável 'API_KEY' não está configurada corretamente.");
  }

  // Sempre cria uma nova instância para garantir que usa a chave mais atual do seletor
  const ai = new GoogleGenAI({ apiKey });
  
  const countInstruction = config?.count === 'auto' 
    ? "gere uma quantidade proporcional à densidade do texto" 
    : `gere exatamente ${config?.count} flashcards`;

  const frontInstruction = {
    curto: "A frente deve ser uma pergunta direta, curta e objetiva.",
    medio: "A frente deve ser uma pergunta contextualizada de tamanho médio.",
    longo: "A frente deve ser um enunciado longo e detalhado."
  }[config?.frontLength || 'medio'];

  const backInstruction = {
    curto: "O verso deve ser uma resposta direta e lacônica.",
    medio: "O verso deve ser uma resposta fundamentada com base legal moderada.",
    longo: "O verso deve ser uma explicação exaustiva e profunda."
  }[config?.backLength || 'medio'];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Você é um tutor de elite da SanFran.
      
      DISCIPLINA: ${subjectName}
      QUANTIDADE: ${countInstruction}
      ESTILO: Frente ${frontInstruction}, Verso ${backInstruction}
      
      TEXTO: "${text}"
      
      REGRAS: Responda APENAS com um array JSON. Sem markdown.`,
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

    const rawText = response.text;
    if (!rawText) throw new Error("O servidor da IA retornou um veredito vazio.");
    
    const jsonStr = cleanJsonResponse(rawText);
    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      throw new Error("A IA enviou dados em formato inválido.");
    }
  } catch (err: any) {
    console.error("Erro Gemini:", err);
    // Extrai mensagem técnica se disponível
    const msg = err.message || JSON.stringify(err);
    throw new Error(msg);
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  const apiKey = getSafeApiKey();
  if (!apiKey) return "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano";
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma frase de motivação curta para um estudante de Direito da SanFran que estuda: ${subjects.join(', ')}. Estilo erudito.`,
    });
    return response.text;
  } catch (e) {
    return "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano";
  }
};
