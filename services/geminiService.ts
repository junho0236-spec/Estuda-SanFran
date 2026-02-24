import { GoogleGenAI, Type } from "@google/genai";

// Inicializa o cliente Google GenAI de forma preguiçosa (lazy)
let aiInstance: GoogleGenAI | null = null;

const getApiKey = (): string => {
  // O Vite EXIGE o prefixo VITE_ para expor variáveis de ambiente ao navegador.
  // A variável no painel da Vercel deve se chamar VITE_API_KEY.
  const key = (import.meta as any).env.VITE_API_KEY;
  
  if (!key) {
    console.warn("Gemini Service: VITE_API_KEY não foi encontrada nas variáveis de ambiente do build.");
  }

  return key || "";
};

const getAiClient = () => {
  if (!aiInstance) {
    const apiKey = getApiKey();
    // A chamada falhará com erro claro se a chave estiver faltando.
    aiInstance = new GoogleGenAI({ apiKey: apiKey || "missing_key" });
  }
  return aiInstance;
};

/**
 * Retorna a chave de API configurada no ambiente (para debug se necessário).
 */
export const getSafeApiKey = (): string | null => {
  const key = getApiKey();
  return key ? `${key.substring(0, 4)}...` : null;
};

export interface GeminiFile {
  data: string; // base64 encoded string
  mimeType: string;
}

/**
 * Gera flashcards a partir de um texto jurídico, arquivos ou URLs utilizando Gemini.
 */
export const generateFlashcards = async (
  text: string, 
  subjectName: string, 
  quantity: number = 5, 
  cardType: string = 'Geral', 
  customInstructions: string = '',
  files: GeminiFile[] = [],
  urls: string[] = [],
  difficulty: string = 'Graduação',
  format: string = 'Básico',
  sourceType: string = 'Geral',
  includeMnemonics: boolean = false
) => {
  try {
    const ai = getAiClient();
    const apiKey = getApiKey();
    
    if (!apiKey || apiKey === "missing_key") {
        throw new Error("Chave de API não detectada. 1) Verifique se a variável 'VITE_API_KEY' está no painel da Vercel. 2) Se estiver, é OBRIGATÓRIO fazer um novo 'Redeploy' para que a alteração tenha efeito.");
    }

    let typeInstruction = '';
    switch (cardType) {
      case 'Conceitos':
        typeInstruction = 'Foque estritamente em definir conceitos jurídicos, princípios e institutos mencionados no texto.';
        break;
      case 'Prazos e Números':
        typeInstruction = 'Foque exclusivamente em prazos processuais, prescricionais, decadenciais, quóruns, maiorias e outros números relevantes.';
        break;
      case 'Exceções':
        typeInstruction = 'Foque nas exceções à regra geral, ressalvas e casos especiais mencionados no texto.';
        break;
      case 'Súmulas e Jurisprudência':
        typeInstruction = 'Foque no entendimento jurisprudencial, súmulas e teses fixadas mencionadas no texto.';
        break;
      case 'Casos Práticos':
        typeInstruction = 'Crie pequenos casos práticos hipotéticos na pergunta (front) e dê a solução jurídica na resposta (back).';
        break;
      default:
        typeInstruction = 'Foque em conceitos-chave, prazos, exceções ou princípios de forma equilibrada.';
    }

    let sourceInstruction = '';
    switch (sourceType) {
      case 'Letra da Lei':
        sourceInstruction = 'O texto é "Letra da Lei". Foque intensamente em prazos, exceções, quóruns e palavras-chave restritivas ou ampliativas (ex: "salvo", "independentemente", "exclusivamente").';
        break;
      case 'Doutrina':
        sourceInstruction = 'O texto é "Doutrina". Foque em teorias, classificações, divergências doutrinárias e conceitos acadêmicos.';
        break;
      case 'Jurisprudência':
        sourceInstruction = 'O texto é "Jurisprudência/Acórdão". Foque na Tese Fixada, Ratio Decidendi, Súmulas relacionadas e o entendimento predominante dos tribunais superiores (STF/STJ).';
        break;
      default:
        sourceInstruction = 'Trate o texto de forma equilibrada entre lei, doutrina e jurisprudência.';
    }

    const formatInstruction = format === 'Cloze' 
      ? 'Use o formato CLOZE (Omissão de Palavras). Na frente (front), coloque a frase com a palavra ou termo omitido entre colchetes, ex: "A prescrição ocorre em [...] anos.". No verso (back), coloque apenas o termo omitido.'
      : 'Use o formato BÁSICO: Uma pergunta ou conceito na frente (front) e a resposta ou definição no verso (back).';

    const difficultyInstruction = `O nível de complexidade deve ser: ${difficulty}. 
      - Iniciante: Linguagem simples, conceitos fundamentais.
      - Graduação: Linguagem técnica acadêmica, doutrina clássica.
      - Concurso/OAB: Foco em "pegadinhas", letra da lei e jurisprudência pesada.`;

    const mnemonicInstruction = includeMnemonics 
      ? 'Sempre que houver uma lista de requisitos, princípios ou elementos, tente criar um mnemônico criativo (sigla ou frase) e inclua-o no final da resposta (back).'
      : '';

    const parts: any[] = [];
    
    // Adiciona o prompt principal
    parts.push({
      text: `Você é um professor de Direito da USP especialista em concursos e OAB. Sua tarefa é criar materiais de estudo ativo de alto nível.
      
      Analise o conteúdo fornecido (texto, arquivos ou URLs) sobre "${subjectName}":
      
      Gere EXATAMENTE ${quantity} flashcards de alta qualidade.
      
      Nível de Dificuldade:
      ${difficultyInstruction}

      Formato do Card:
      ${formatInstruction}

      Tipo de Fonte:
      ${sourceInstruction}
      
      Diretriz de Foco (${cardType}):
      ${typeInstruction}

      Mnemônicos:
      ${mnemonicInstruction}
      
      Instruções Adicionais do Usuário:
      ${customInstructions ? customInstructions : 'Nenhuma instrução adicional.'}
      
      - As perguntas (front) devem ser desafiadoras e claras.
      - As respostas (back) devem ser objetivas, didáticas e, se possível, citar o artigo de lei ou súmula pertinente.
      - Para cada card, sugira de 2 a 4 tags relevantes (ex: #prazos, #recursos, #cpc-art-1003).
      - Identifique a fonte ou artigo de lei específico citado no conteúdo para o campo "source".
      - DETECÇÃO DE DESATUALIZAÇÃO: Se detectar que o texto cita leis revogadas ou normas antigas (ex: CPC/1973, Código Civil/1916), adicione um aviso claro no início da resposta (back) alertando sobre a desatualização e, se souber, a norma vigente equivalente.
      - Se o conteúdo fornecido for sem sentido ou insuficiente, retorne um array vazio.`
    });

    // Adiciona o texto se houver
    if (text) {
      parts.push({ text: `Texto Base:\n"${text}"` });
    }

    // Adiciona arquivos se houver
    if (files && files.length > 0) {
      files.forEach(file => {
        parts.push({
          inlineData: {
            data: file.data,
            mimeType: file.mimeType
          }
        });
      });
    }

    // Adiciona URLs se houver (como texto no prompt se urlContext não for usado, 
    // mas vamos tentar usar o tool se possível)
    const tools: any[] = [];
    if (urls && urls.length > 0) {
      tools.push({ urlContext: {} });
      // Também incluímos as URLs no texto para garantir que o modelo saiba quais processar
      parts.push({ text: `URLs para consulta:\n${urls.join('\n')}` });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: { parts },
      config: {
        tools: tools.length > 0 ? tools : undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: {
                type: Type.STRING,
                description: 'A pergunta jurídica, caso prático curto ou conceito a ser definido.',
              },
              back: {
                type: Type.STRING,
                description: 'A resposta correta, explicação doutrinária e fundamentação legal.',
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Tags sugeridas para organização (ex: #prazos, #cpc).',
              },
              source: {
                type: Type.STRING,
                description: 'A fonte bibliográfica ou artigo de lei específico (ex: Art. 5º, CF).',
              },
            },
            required: ['front', 'back'],
          },
        },
      },
    });

    const resultText = response.text;
    
    if (!resultText) {
        throw new Error("A IA retornou uma resposta vazia. Tente outro texto.");
    }

    try {
        const parsed = JSON.parse(resultText);
        if (!Array.isArray(parsed)) {
            throw new Error("Formato de resposta inválido (não é lista).");
        }
        return parsed;
    } catch (parseError) {
        console.error("JSON Parse Error:", resultText);
        throw new Error("Erro ao processar resposta da IA.");
    }

  } catch (error: any) {
    console.error("Erro detalhado ao gerar flashcards:", error);
    
    if (error.status === 403 || (error.message && error.message.includes("API key"))) {
        throw new Error("Erro de Permissão (403). Verifique se: \n1) O valor da VITE_API_KEY está correto. \n2) A API 'Generative Language' está ATIVADA no seu projeto Google Cloud. \n3) O faturamento está ativo no projeto.");
    }
    if (error.status === 400) {
        throw new Error("Erro na Requisição (400): O texto pode ser muito longo ou inválido.");
    }
    if (error.status === 429) {
        throw new Error("Muitas requisições. O modelo está sobrecarregado. Aguarde um momento.");
    }
    
    throw error;
  }
};

/**
 * Retorna uma frase de motivação em latim com tradução.
 */
export const getStudyMotivation = async (subjects: string[]) => {
  const list = subjects.length > 0 ? subjects.join(", ") : "Direito";
  
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sou um estudante de Direito na SanFran (USP). Atualmente estudo: ${list}. Dê uma frase curta de motivação em latim relevante ao estudo jurídico e sua tradução em português.`,
    });
    return response.text || "Scientia Vinces.";
  } catch (error) {
    console.warn("Erro ao buscar motivação via IA:", error);
    return "Scientia Vinces.";
  }
};

/**
 * Simplifica textos jurídicos complexos.
 */
export const simplifyLegalText = async (complexText: string) => {
  try {
    const ai = getAiClient();
    const apiKey = getApiKey();

    if (!apiKey || apiKey === "missing_key") {
      return "Erro: Chave de API (VITE_API_KEY) não configurada. Verifique as variáveis de ambiente e faça um novo deploy.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Você é um professor assistente da Faculdade de Direito do Largo São Francisco. 
      Sua tarefa é "traduzir" o seguinte texto jurídico complexo (juridiquês) para uma linguagem clara, didática e direta, acessível a um estudante de primeiro ano.
      Mantenha a precisão técnica, mas explique termos difíceis se necessário.
      
      Texto para simplificar:
      "${complexText}"`,
    });
    return response.text;
  } catch (error: any) {
    console.error("Erro ao simplificar texto:", error);
    if (error.message.includes("API key")) return "Erro de Configuração: API Key inválida.";
    return "Não foi possível simplificar o texto no momento. Verifique sua conexão.";
  }
};

/**
 * Explica um termo jurídico específico dentro de um contexto.
 */
export const explainLegalTerm = async (term: string, context: string) => {
  try {
    const ai = getAiClient();
    const apiKey = getApiKey();

    if (!apiKey || apiKey === "missing_key") {
      return "Erro: Chave de API não configurada.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Você é um glossário jurídico inteligente.
      
      O usuário selecionou o termo: "${term}"
      Do seguinte texto: "${context}"
      
      1. Dê uma definição simples e direta deste termo (máximo 2 frases).
      2. Sugira 2 ou 3 sinônimos ou expressões mais simples que poderiam substituí-lo neste contexto.
      
      Retorne a resposta em formato Markdown simples.`,
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao explicar termo:", error);
    return "Não foi possível explicar o termo no momento.";
  }
};

/**
 * Gera um mnemônico criativo a partir de uma lista de requisitos ou palavras.
 */
export const generateMnemonic = async (requirements: string) => {
  try {
    const ai = getAiClient();
    const apiKey = getApiKey();

    if (!apiKey || apiKey === "missing_key") {
      throw new Error("Chave de API não configurada.");
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Você é um especialista em técnicas de memorização para estudantes de Direito.
      
      Crie um mnemônico (sigla, acrônimo ou frase engraçada/criativa) para ajudar a memorizar a seguinte lista de itens/requisitos:
      "${requirements}"
      
      Retorne um JSON com o seguinte formato:
      {
        "acronym": "A sigla ou palavra principal gerada",
        "title": "Um título curto para o assunto",
        "expansion": [
          { "letter": "Letra ou sílaba", "meaning": "O significado correspondente" }
        ],
        "description": "Uma breve explicação ou frase engraçada para ajudar a lembrar"
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            acronym: { type: Type.STRING },
            title: { type: Type.STRING },
            expansion: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  letter: { type: Type.STRING },
                  meaning: { type: Type.STRING }
                },
                required: ['letter', 'meaning']
              }
            },
            description: { type: Type.STRING }
          },
          required: ['acronym', 'title', 'expansion', 'description']
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Resposta vazia da IA.");
    
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Erro ao gerar mnemônico:", error);
    throw error;
  }
};

/**
 * Gera um resumo conciso de um texto longo.
 */
export const summarizeText = async (text: string) => {
  try {
    const ai = getAiClient();
    const apiKey = getApiKey();

    if (!apiKey || apiKey === "missing_key") {
      return "Erro: Chave de API não configurada.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Você é um assistente de estudo jurídico.
      Resuma o seguinte texto de forma concisa e didática, focando nos pontos mais importantes. O resumo deve ter entre 3 a 5 parágrafos.
      
      Texto para resumir:
      "${text}"`,
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao resumir texto:", error);
    return "Não foi possível resumir o texto no momento.";
  }
};

/**
 * Extrai os pontos-chave de um texto.
 */
export const extractKeyPoints = async (text: string) => {
  try {
    const ai = getAiClient();
    const apiKey = getApiKey();

    if (!apiKey || apiKey === "missing_key") {
      return "Erro: Chave de API não configurada.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Você é um assistente de estudo jurídico.
      Extraia os 5 a 10 pontos-chave mais importantes do seguinte texto. Apresente-os como uma lista numerada.
      
      Texto para analisar:
      "${text}"`,
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao extrair pontos-chave:", error);
    return "Não foi possível extrair os pontos-chave no momento.";
  }
};

/**
 * Gera um mapa mental textual dos principais conceitos de um texto.
 */
export const generateMindMap = async (text: string) => {
  try {
    const ai = getAiClient();
    const apiKey = getApiKey();

    if (!apiKey || apiKey === "missing_key") {
      return "Erro: Chave de API não configurada.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Você é um assistente de estudo jurídico.
      Crie um mapa mental textual (usando tópicos e sub-tópicos com indentação) dos principais conceitos e suas relações no seguinte texto.
      Comece com o tema central e ramifique para os sub-temas e detalhes.
      
      Texto para mapear:
      "${text}"`,
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao gerar mapa mental:", error);
    return "Não foi possível gerar o mapa mental no momento.";
  }
};
