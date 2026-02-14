
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

/**
 * Limpa a string de resposta da IA removendo blocos de código markdown
 * e espaços desnecessários que podem quebrar o JSON.parse
 */
const cleanJsonResponse = (rawText: string): string => {
  let cleaned = rawText.trim();
  // Remove blocos de código markdown se existirem
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
    throw new Error("DILIGÊNCIA NECESSÁRIA: A variável 'API_KEY' não está configurada corretamente no ambiente.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const countInstruction = config?.count === 'auto' 
    ? "gere uma quantidade proporcional à densidade e relevância jurídica do texto" 
    : `gere exatamente ${config?.count} flashcards`;

  const frontInstruction = {
    curto: "A frente deve ser uma pergunta direta, curta e objetiva.",
    medio: "A frente deve ser uma pergunta contextualizada de tamanho médio.",
    longo: "A frente deve ser um enunciado longo, como um caso prático ou item de edital detalhado."
  }[config?.frontLength || 'medio'];

  const backInstruction = {
    curto: "O verso deve ser uma resposta direta, lacônica e sem rodeios.",
    medio: "O verso deve ser uma resposta fundamentada com base legal ou doutrinária moderada.",
    longo: "O verso deve ser uma explicação exaustiva, profunda, citando dispositivos legais e correntes doutrinárias."
  }[config?.backLength || 'medio'];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Você é um tutor de elite da SanFran (Academia Jurídica FDUSP).
      
      OBJETIVO: Transformar o texto jurídico fornecido em Flashcards de alta qualidade.
      
      DISCIPLINA: ${subjectName}
      CONFIGURAÇÃO TÉCNICA: 
      - Quantidade: ${countInstruction}
      - Estilo Frente: ${frontInstruction}
      - Estilo Verso: ${backInstruction}
      
      TEXTO PARA ANÁLISE: 
      "${text}"
      
      REGRAS CRÍTICAS:
      1. Responda ESTRITAMENTE com um array JSON.
      2. NÃO inclua saudações, explicações ou blocos de código markdown.
      3. Foco absoluto em prazos processuais, conceitos em latim, súmulas e doutrina clássica.
      4. Se o texto for insuficiente, tente extrair os conceitos fundamentais do tema ${subjectName}.`,
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
      console.error("Falha ao analisar JSON da IA:", jsonStr);
      throw new Error("A IA enviou dados em formato inválido para o sistema.");
    }
  } catch (err: any) {
    console.error("Erro Gemini Detalhado:", err);
    // Repassa o erro de forma amigável mas informativa
    const errorMsg = err.message || "Erro desconhecido na comunicação com a IA.";
    throw new Error(`Despacho de Erro: ${errorMsg}`);
  }
};

export const getStudyMotivation = async (subjects: string[]) => {
  const apiKey = getSafeApiKey();
  if (!apiKey) return "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano";
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma frase de motivação curta para um estudante de Direito da SanFran que estuda: ${subjects.join(', ')}. Estilo erudito e clássico. Use máximas latinas se apropriado.`,
    });
    return response.text;
  } catch (e) {
    return "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano";
  }
};
